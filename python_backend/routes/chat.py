"""
Chat routes
"""

from flask import Blueprint, request, jsonify
from database import db_session
from services import db_operations, perplexity
from routes.auth import get_current_user
import threading
from datetime import datetime, timezone
from utils.datetime_utils import now_utc

bp = Blueprint('chat', __name__)


@bp.route('/send', methods=['POST'])
def send_message():
    """Send message and get AI response - OPTIMIZED FOR SPEED"""
    import time
    start_time = time.time()
    
    user = get_current_user()
    data = request.get_json()
    
    conversation_id = data.get('conversationId')  # Optional for temporary chats
    message = data.get('message')
    model = data.get('model', 'sonar')  # Use faster 'sonar' instead of 'sonar-pro'
    
    if not message:
        return jsonify({'error': 'message is required'}), 400
    
    # Temporary chat mode - no conversation ID provided
    is_temporary_chat = not conversation_id
    
    db = db_session()
    try:
        # For regular chats, load minimal context
        if not is_temporary_chat:
            # OPTIMIZATION: Get ONLY last 2 messages for context (faster query)
            from sqlalchemy import desc
            from models import Message
            history = db.query(Message).filter(
                Message.conversation_id == conversation_id
            ).order_by(desc(Message.created_at)).limit(2).all()
            history = list(reversed(history))
            
            session_context = perplexity.build_session_context([
                {'role': str(msg.role), 'content': str(msg.content)}
                for msg in history
            ], max_messages=2)
        else:
            # Temporary chat - no history, just the current message
            session_context = []
        
        # OPTIMIZATION: Load ONLY preferences (fast, no joins)
        user_context = None
        if user:
            preferences_data = db_operations.get_user_preferences(db, str(user.id))
            
            if preferences_data:
                user_context = {
                    'preferences': {
                        'ageGroup': str(preferences_data.age_group) if preferences_data.age_group is not None else None,
                        'responseStyle': str(preferences_data.response_style) if preferences_data.response_style is not None else None,
                        'languageComplexity': str(preferences_data.language_complexity) if preferences_data.language_complexity is not None else None,
                        'includeMedicalTerms': preferences_data.include_medical_terms if preferences_data.include_medical_terms is not None else None,
                        'responseLength': str(preferences_data.response_length) if preferences_data.response_length is not None else None
                    }
                }
        
        # Build messages for Perplexity (no patient memory prompt for speed)
        messages_for_api = session_context.copy()
        new_user_message = {'role': 'user', 'content': message}
        
        last_msg = messages_for_api[-1] if messages_for_api else None
        if last_msg and last_msg['role'] == 'user':
            last_msg['content'] += f"\n{new_user_message['content']}"
        else:
            messages_for_api.append(new_user_message)
        
        print(f"[PERF] DB operations: {time.time() - start_time:.2f}s")
        api_start = time.time()
        
        # Call Perplexity API
        response = perplexity.call_perplexity(
            messages_for_api,
            model,
            user_context,
            message
        )
        
        print(f"[PERF] Perplexity API: {time.time() - api_start:.2f}s")
        
        # Save assistant response (only for regular chats) - DO THIS IN BACKGROUND
        if not is_temporary_chat:
            # CRITICAL: Save in background thread to not block response
            def save_messages_background():
                bg_db = db_session()
                try:
                    # Save user message
                    db_operations.create_message(bg_db, conversation_id, 'user', message, generate_embedding=False)
                    # Save assistant message
                    db_operations.create_message(
                        bg_db,
                        conversation_id,
                        'assistant',
                        response['content'],
                        response.get('citations'),
                        response.get('searchResults'),
                        response.get('model'),
                        generate_embedding=False
                    )
                    print("[PERF] Background save completed")
                except Exception as e:
                    print(f"[PERF] Background save failed: {e}")
                finally:
                    bg_db.close()
            
            # Start background save
            threading.Thread(target=save_messages_background, daemon=True).start()
            
            print(f"[PERF] ✅ Total response time: {time.time() - start_time:.2f}s")
            
            # Return response immediately
            return jsonify({
                'message': {
                    'id': f'msg_{int(now_utc().timestamp() * 1000)}',
                    'conversationId': conversation_id,
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
        else:
            print(f"[PERF] ✅ Total response time: {time.time() - start_time:.2f}s")
            # Return response for temporary chat (no database storage)
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
