"""
Preferences routes
"""

from flask import Blueprint, request, jsonify
from database import db_session
from services import db_operations
from routes.auth import require_auth

bp = Blueprint('preferences', __name__)


@bp.route('', methods=['GET'])
@require_auth
def get_preferences(user):
    """Get user preferences"""
    db = db_session()
    try:
        prefs = db_operations.get_user_preferences(db, str(user.id))
        
        if not prefs:
            return jsonify({
                'preferredModel': 'sonar-pro',
                'theme': 'light',
                'ageGroup': 'middle-aged',
                'responseStyle': 'professional',
                'languageComplexity': 'moderate',
                'includeMedicalTerms': True,
                'responseLength': 'concise'
            }), 200
        
        return jsonify({
            'preferredModel': prefs.preferred_model,
            'theme': prefs.theme,
            'ageGroup': prefs.age_group,
            'responseStyle': prefs.response_style,
            'languageComplexity': prefs.language_complexity,
            'includeMedicalTerms': prefs.include_medical_terms,
            'responseLength': prefs.response_length
        }), 200
    finally:
        db.close()


@bp.route('', methods=['PUT'])
@require_auth
def update_preferences(user):
    """Update user preferences"""
    data = request.get_json()
    
    db = db_session()
    try:
        updates = {}
        if 'preferredModel' in data:
            updates['preferred_model'] = data['preferredModel']
        if 'theme' in data:
            updates['theme'] = data['theme']
        if 'ageGroup' in data:
            updates['age_group'] = data['ageGroup']
        if 'responseStyle' in data:
            updates['response_style'] = data['responseStyle']
        if 'languageComplexity' in data:
            updates['language_complexity'] = data['languageComplexity']
        if 'includeMedicalTerms' in data:
            updates['include_medical_terms'] = data['includeMedicalTerms']
        if 'responseLength' in data:
            updates['response_length'] = data['responseLength']
        
        db_operations.upsert_user_preferences(db, str(user.id), updates)
        return jsonify({'success': True}), 200
    finally:
        db.close()
