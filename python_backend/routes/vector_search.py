"""
Vector Search Routes
API endpoints for semantic similarity search using vector embeddings
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from database import get_db
from services.db_operations import (
    search_similar_patient_memories,
    search_similar_messages,
    get_embedding_statistics,
    backfill_message_embeddings,
    backfill_patient_memory_embeddings
)
from routes.auth import require_auth

vector_search_bp = Blueprint('vector_search', __name__)


@vector_search_bp.route('/search/memories', methods=['POST'])
@require_auth
def search_memories(user):
    """
    Search for similar patient memories using vector similarity
    
    Request Body:
        query (str): Search query text
        match_threshold (float, optional): Similarity threshold (0-1, default 0.7)
        match_count (int, optional): Max results (default 5)
    
    Returns:
        200: List of similar patient memories with similarity scores
    """
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'Query text is required'}), 400
        
        match_threshold = data.get('match_threshold', 0.7)
        match_count = data.get('match_count', 5)
        
        # Validate parameters
        if not 0 <= match_threshold <= 1:
            return jsonify({'error': 'match_threshold must be between 0 and 1'}), 400
        
        if not 1 <= match_count <= 50:
            return jsonify({'error': 'match_count must be between 1 and 50'}), 400
        
        db = next(get_db())
        results = search_similar_patient_memories(
            db=db,
            query_text=query,
            user_id=user.id,
            match_threshold=match_threshold,
            match_count=match_count
        )
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results)
        }), 200
    
    except Exception as e:
        print(f"Error in memory search: {e}")
        return jsonify({'error': str(e)}), 500


@vector_search_bp.route('/search/messages', methods=['POST'])
@require_auth
def search_messages_endpoint(user):
    """
    Search for similar messages using vector similarity
    
    Request Body:
        query (str): Search query text
        conversation_id (str, optional): Filter by conversation ID
        match_threshold (float, optional): Similarity threshold (0-1, default 0.7)
        match_count (int, optional): Max results (default 10)
    
    Returns:
        200: List of similar messages with similarity scores
    """
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'Query text is required'}), 400
        
        conversation_id = data.get('conversation_id')
        match_threshold = data.get('match_threshold', 0.7)
        match_count = data.get('match_count', 10)
        
        # Validate parameters
        if not 0 <= match_threshold <= 1:
            return jsonify({'error': 'match_threshold must be between 0 and 1'}), 400
        
        if not 1 <= match_count <= 100:
            return jsonify({'error': 'match_count must be between 1 and 100'}), 400
        
        db = next(get_db())
        results = search_similar_messages(
            db=db,
            query_text=query,
            conversation_id=conversation_id,
            match_threshold=match_threshold,
            match_count=match_count
        )
        
        return jsonify({
            'success': True,
            'query': query,
            'conversationId': conversation_id,
            'results': results,
            'count': len(results)
        }), 200
    
    except Exception as e:
        print(f"Error in message search: {e}")
        return jsonify({'error': str(e)}), 500


@vector_search_bp.route('/embeddings/stats', methods=['GET'])
@require_auth
def embedding_stats(user):
    """
    Get embedding coverage statistics
    
    Returns:
        200: Statistics showing embedding coverage for each table
    """
    try:
        db = next(get_db())
        stats = get_embedding_statistics(db)
        
        return jsonify({
            'success': True,
            'statistics': stats
        }), 200
    
    except Exception as e:
        print(f"Error getting embedding stats: {e}")
        return jsonify({'error': str(e)}), 500


@vector_search_bp.route('/embeddings/backfill/messages', methods=['POST'])
@require_auth
def backfill_messages(user):
    """
    Backfill embeddings for existing messages
    Admin/user can trigger backfill for their conversations
    
    Request Body:
        batch_size (int, optional): Messages per batch (default 100)
        conversation_id (str, optional): Limit to specific conversation
    
    Returns:
        200: Number of messages updated with embeddings
    """
    try:
        data = request.get_json() or {}
        batch_size = data.get('batch_size', 100)
        conversation_id = data.get('conversation_id')
        
        if not 1 <= batch_size <= 500:
            return jsonify({'error': 'batch_size must be between 1 and 500'}), 400
        
        db = next(get_db())
        updated_count = backfill_message_embeddings(
            db=db,
            batch_size=batch_size,
            conversation_id=conversation_id
        )
        
        return jsonify({
            'success': True,
            'updatedCount': updated_count,
            'message': f'Successfully generated embeddings for {updated_count} messages'
        }), 200
    
    except Exception as e:
        print(f"Error backfilling message embeddings: {e}")
        return jsonify({'error': str(e)}), 500


@vector_search_bp.route('/embeddings/backfill/memories', methods=['POST'])
@require_auth
def backfill_memories(user):
    """
    Backfill embeddings for existing patient memories
    
    Request Body:
        batch_size (int, optional): Memories per batch (default 100)
    
    Returns:
        200: Number of memories updated with embeddings
    """
    try:
        data = request.get_json() or {}
        batch_size = data.get('batch_size', 100)
        
        if not 1 <= batch_size <= 500:
            return jsonify({'error': 'batch_size must be between 1 and 500'}), 400
        
        db = next(get_db())
        # Limit to current user's memories
        updated_count = backfill_patient_memory_embeddings(
            db=db,
            batch_size=batch_size,
            user_id=user.id
        )
        
        return jsonify({
            'success': True,
            'updatedCount': updated_count,
            'message': f'Successfully generated embeddings for {updated_count} patient memories'
        }), 200
    
    except Exception as e:
        print(f"Error backfilling patient memory embeddings: {e}")
        return jsonify({'error': str(e)}), 500
