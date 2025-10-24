"""
Profile routes
"""

from flask import Blueprint, request, jsonify
from database import db_session
from services import db_operations
from routes.auth import require_auth

bp = Blueprint('profile', __name__)


@bp.route('', methods=['GET'])
@require_auth
def get_profile(user):
    """Get user profile"""
    db = db_session()
    try:
        profile = db_operations.get_user_profile(db, str(user.id))
        if not profile:
            return jsonify(None), 200
        
        return jsonify({
            'id': profile.id,
            'name': profile.name,
            'email': profile.email,
            'profileImage': profile.profile_image,
            'bio': profile.bio,
            'dateOfBirth': profile.date_of_birth,
            'phone': profile.phone,
            'address': profile.address
        }), 200
    finally:
        db.close()


@bp.route('', methods=['PUT'])
@require_auth
def update_profile(user):
    """Update user profile"""
    data = request.get_json()
    
    db = db_session()
    try:
        updates = {}
        if 'name' in data:
            updates['name'] = data['name']
        if 'email' in data:
            updates['email'] = data['email']
        if 'profileImage' in data:
            updates['profile_image'] = data['profileImage']
        if 'bio' in data:
            updates['bio'] = data['bio']
        if 'dateOfBirth' in data:
            updates['date_of_birth'] = data['dateOfBirth']
        if 'phone' in data:
            updates['phone'] = data['phone']
        if 'address' in data:
            updates['address'] = data['address']
        
        db_operations.update_user_profile(db, str(user.id), updates)
        return jsonify({'success': True}), 200
    finally:
        db.close()
