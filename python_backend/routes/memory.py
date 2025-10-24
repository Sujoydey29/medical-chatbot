"""
Memory routes
"""

from flask import Blueprint, request, jsonify
from database import db_session
from services import db_operations
from routes.auth import require_auth

bp = Blueprint('memory', __name__)


@bp.route('/patient', methods=['GET'])
@require_auth
def list_memory(user):
    """Get patient memory"""
    db = db_session()
    try:
        memories = db_operations.get_user_patient_memory(db, str(user.id))
        
        return jsonify([{
            'id': mem.id,
            'userId': mem.user_id,
            'entityType': mem.entity_type,
            'entityName': mem.entity_name,
            'relationships': mem.relationships,
            'metadata': mem.entity_metadata,
            'conversationId': mem.conversation_id,
            'createdAt': mem.created_at.isoformat(),
            'updatedAt': mem.updated_at.isoformat()
        } for mem in memories]), 200
    finally:
        db.close()


@bp.route('/patient/<memory_id>', methods=['DELETE'])
@require_auth
def delete_memory(user, memory_id):
    """Delete specific memory"""
    db = db_session()
    try:
        db_operations.delete_patient_memory(db, memory_id)
        return jsonify({'success': True}), 200
    finally:
        db.close()


@bp.route('/patient/clear', methods=['POST'])
@require_auth
def clear_all_memory(user):
    """Clear all patient memory"""
    db = db_session()
    try:
        memories = db_operations.get_user_patient_memory(db, str(user.id))
        for mem in memories:
            db_operations.delete_patient_memory(db, str(mem.id))
        return jsonify({'success': True}), 200
    finally:
        db.close()
