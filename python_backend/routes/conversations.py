"""
Conversation routes
"""

from flask import Blueprint, request, jsonify
from database import db_session
from services import db_operations
from routes.auth import require_auth

bp = Blueprint('conversations', __name__)


@bp.route('', methods=['POST'])
def create_conversation():
    """Create new conversation"""
    from routes.auth import get_current_user
    user = get_current_user()
    
    data = request.get_json() or {}
    title = data.get('title', 'New Conversation')
    
    db = db_session()
    try:
        conversation = db_operations.create_conversation(
            db,
            user_id=str(user.id) if user else None,
            title=title,
            is_guest=not user
        )
        
        return jsonify({
            'conversation': {
                'id': conversation.id,
                'userId': conversation.user_id,
                'title': conversation.title,
                'isGuest': conversation.is_guest,
                'createdAt': conversation.created_at.isoformat(),
                'updatedAt': conversation.updated_at.isoformat()
            }
        }), 201
    finally:
        db.close()


@bp.route('', methods=['GET'])
@require_auth
def list_conversations(user):
    """Get user's conversations"""
    db = db_session()
    try:
        conversations = db_operations.get_user_conversations(db, str(user.id))
        
        return jsonify([{
            'id': conv.id,
            'userId': conv.user_id,
            'title': conv.title,
            'isGuest': conv.is_guest,
            'createdAt': conv.created_at.isoformat(),
            'updatedAt': conv.updated_at.isoformat()
        } for conv in conversations]), 200
    finally:
        db.close()


@bp.route('/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """Get conversation with messages"""
    db = db_session()
    try:
        conversation = db_operations.get_conversation(db, conversation_id)
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        messages = db_operations.get_conversation_messages(db, conversation_id)
        
        messages_data = []
        for msg in messages:
            # Get search results from database (JSON column)
            # SQLAlchemy returns JSON as Python objects (list/dict)
            search_results: list = msg.search_results or []  # type: ignore
            
            # Filter out search results with invalid URLs (from old messages)
            # This prevents "Invalid URL" errors in the frontend
            filtered_results = []
            for result in search_results:
                if isinstance(result, dict):
                    url = result.get('url')
                    title = result.get('title')
                    if url and isinstance(url, str) and url.strip() and title and isinstance(title, str) and title.strip():
                        filtered_results.append(result)
            
            messages_data.append({
                'id': msg.id,
                'conversationId': msg.conversation_id,
                'role': msg.role,
                'content': msg.content,
                'citations': msg.citations,
                'searchResults': filtered_results,
                'model': msg.model,
                'createdAt': msg.created_at.isoformat()
            })
        
        return jsonify({
            'conversation': {
                'id': conversation.id,
                'userId': conversation.user_id,
                'title': conversation.title,
                'isGuest': conversation.is_guest,
                'createdAt': conversation.created_at.isoformat(),
                'updatedAt': conversation.updated_at.isoformat()
            },
            'messages': messages_data
        }), 200
    finally:
        db.close()


@bp.route('/<conversation_id>', methods=['PUT'])
def update_title(conversation_id):
    """Update conversation title"""
    data = request.get_json()
    title = data.get('title')
    
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    
    db = db_session()
    try:
        db_operations.update_conversation_title(db, conversation_id, title)
        return jsonify({'success': True}), 200
    finally:
        db.close()


@bp.route('/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """Delete conversation"""
    db = db_session()
    try:
        db_operations.delete_conversation(db, conversation_id)
        return jsonify({'success': True}), 200
    finally:
        db.close()
