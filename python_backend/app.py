"""
Main Flask application
Entry point for the MedChat Python backend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from database import init_db, close_db
import os

# Import routes
from routes import auth, conversations, chat, memory, profile, preferences, vector_search

# Create Flask app
app = Flask(__name__)

# Configure CORS
CORS(app, 
     origins=Config.CORS_ORIGINS,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# Initialize database
init_db()


# Register blueprints (API routes)
app.register_blueprint(auth.bp, url_prefix='/api/auth')
app.register_blueprint(conversations.bp, url_prefix='/api/conversations')
app.register_blueprint(chat.bp, url_prefix='/api/chat')
app.register_blueprint(memory.bp, url_prefix='/api/memory')
app.register_blueprint(profile.bp, url_prefix='/api/profile')
app.register_blueprint(preferences.bp, url_prefix='/api/preferences')
app.register_blueprint(vector_search.vector_search_bp, url_prefix='/api/vector')


# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'MedChat Python Backend is running',
        'version': '1.0.0'
    }), 200


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# Cleanup on shutdown
@app.teardown_appcontext
def shutdown_session(exception=None):
    close_db()


if __name__ == '__main__':
    port = Config.PORT
    print(f'🚀 MedChat Python Backend starting on http://localhost:{port}')
    print(f'📊 Database: Connected to Supabase')
    print(f'🔥 Firebase Admin: Initialized')
    print(f'🤖 Perplexity API: Ready')
    
    # PRE-LOAD embedding model on startup (CRITICAL for speed)
    print(f'⚡ Pre-loading embedding model...')
    from services.embedding_service import get_embedding_service
    embedding_svc = get_embedding_service()
    print(f'✅ Embedding model ready: {embedding_svc.EMBEDDING_DIMENSIONS}d')
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )
