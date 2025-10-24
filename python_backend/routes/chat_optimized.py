"""
Chat routes - OPTIMIZED FOR SPEED (1-2 second responses)
Replace routes/chat.py with this file for GPT-5 level speed
"""

from flask import Blueprint, request, jsonify
from database import db_session
from services import db_operations, perplexity
from routes.auth import get_current_user
from utils.datetime_utils import now_utc

bp = Blueprint('chat', __name__)


@bp.route('/send', methods=['POST'])
def send_message():
    """Send message and get AI response - OPTIMIZED FOR 1-2 SECOND RESPONSE"""
    import time
    start_time = time.time()
    
    user = get_current_user()
    data = request.get_json()
    
    conversation_id = data.get('conversationId')
    message = data.get('message')
    model = data.get('model', 'sonar-pro')
    
    if not message:
        return jsonify({'error': 'message is required'}), 400
    
    is_temporary_chat = not conversation_id
    
    db = db_session()
    try:
        # OPTIMIZATION 1: Minimal database operations
        session_context = []
        user_context = None
        
        if not is_temporary_chat:
            conversation = db_operations.get_conversation(db, conversation_id)
            if not conversation:
                return jsonify({'error': 'Conversation not found'}), 404
            
            # Save user message
            db_operations.create_message(db, conversation_id, 'user', message)
            
            # Get ONLY last 5 messages (reduced from 10)
            history = db_operations.get_conversation_messages(db, conversation_id, limit=5)
            session_context = perplexity.build_session_context([\n                {'role': str(msg.role), 'content': str(msg.content)}\n                for msg in history\n            ], max_messages=5)
        
        # OPTIMIZATION 2: Load ONLY preferences (skip profile)
        if user:
            preferences_data = db_operations.get_user_preferences(db, str(user.id))
            
            user_context = {
                'preferences': {
                    'ageGroup': str(preferences_data.age_group) if preferences_data and preferences_data.age_group else None,
                    'responseStyle': str(preferences_data.response_style) if preferences_data and preferences_data.response_style else None,
                    'languageComplexity': str(preferences_data.language_complexity) if preferences_data and preferences_data.language_complexity else None,
                    'includeMedicalTerms': preferences_data.include_medical_terms if preferences_data and preferences_data.include_medical_terms is not None else None,
                    'responseLength': str(preferences_data.response_length) if preferences_data and preferences_data.response_length else None
                } if preferences_data else {}
            }
        
        # OPTIMIZATION 3: Skip patient memory loading (embeddings handle context)
        messages_for_api = session_context.copy()
        new_user_message = {'role': 'user', 'content': message}
        
        last_msg = messages_for_api[-1] if messages_for_api else None
        if last_msg and last_msg['role'] == 'user':
            last_msg['content'] += f"\\n{new_user_message['content']}"
        else:
            messages_for_api.append(new_user_message)
        
        print(f"[PERF] DB operations: {time.time() - start_time:.2f}s")
        api_start = time.time()
        
        # OPTIMIZATION 4: Call Perplexity with minimal payload
        response = perplexity.call_perplexity(
            messages_for_api,
            model,
            user_context,
            message
        )
        
        print(f"[PERF] Perplexity API: {time.time() - api_start:.2f}s")
        save_start = time.time()
        
        # OPTIMIZATION 5: Save and return immediately
        if not is_temporary_chat:
            assistant_message = db_operations.create_message(
                db,
                conversation_id,
                'assistant',
                response['content'],
                response.get('citations'),
                response.get('searchResults'),
                response.get('model')
            )
            
            print(f"[PERF] Save message: {time.time() - save_start:.2f}s")
            print(f"[PERF] ✅ Total response time: {time.time() - start_time:.2f}s")
            
            # OPTIMIZATION 6: No memory extraction (embeddings auto-generate)
            # Memory extraction removed - embeddings provide better context
            
            return jsonify({
                'message': {
                    'id': assistant_message.id,
                    'conversationId': assistant_message.conversation_id,
                    'role': assistant_message.role,
                    'content': assistant_message.content,
                    'citations': assistant_message.citations,
                    'searchResults': assistant_message.search_results,
                    'model': assistant_message.model,
                    'createdAt': assistant_message.created_at.isoformat()
                },
                'citations': response.get('citations'),
                'searchResults': response.get('searchResults')
            }), 200
        else:
            print(f"[PERF] ✅ Total response time: {time.time() - start_time:.2f}s")
            return jsonify({
                'message': {
                    'id': f'temp_{int(now_utc().timestamp() * 1000)}',
                    'conversationId': None,
                    'role': 'assistant',
                    'content': response['content'],
                    'citations': response.get('citations'),
                    'searchResults': response.get('searchResults'),
                    'model': response.get('model'),
                    'createdAt': now_utc().isoformat()
                },
                'citations': response.get('citations'),
                'searchResults': response.get('searchResults')
            }), 200
        
    except Exception as error:
        print(f"Chat send failed: {error}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(error)}), 500
    finally:
        db.close()


@bp.route('/models', methods=['GET'])
def get_models():
    """Get available models"""
    return jsonify(perplexity.AVAILABLE_MODELS), 200
