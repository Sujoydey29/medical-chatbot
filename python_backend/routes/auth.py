"""
Authentication routes
Replicates server/_core/oauth.ts functionality
"""

from flask import Blueprint, request, jsonify, make_response
from functools import wraps
from typing import Optional
from database import db_session
from services import db_operations
from utils.auth import create_session_token, verify_session, hash_password, verify_password, generate_id
from utils.firebase_admin import verify_firebase_token
from config import Config

bp = Blueprint('auth', __name__)


# Authentication decorator
def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Please login (10001)'}), 401
        return f(user=user, *args, **kwargs)
    return decorated_function


def get_current_user():
    """Get current user from session cookie"""
    token = request.cookies.get(Config.COOKIE_NAME)
    if not token:
        return None
    
    session = verify_session(token)
    if not session:
        return None
    
    user_id = session.get('openId')
    if not user_id:
        return None
    
    db = db_session()
    user = db_operations.get_user(db, user_id)
    db.close()
    
    return user


@bp.route('/me', methods=['GET'])
def get_me():
    """Get current user"""
    user = get_current_user()
    if not user:
        return jsonify(None), 200
    
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'loginMethod': user.login_method,
        'profileImage': user.profile_image,
        'lastSignedIn': user.last_signed_in.isoformat() if user.last_signed_in is not None else None
    }), 200


@bp.route('/register', methods=['POST'])
def register():
    """Register new user with email/password"""
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user_id = generate_id('user')
    password_hash_value = hash_password(password)
    
    db = db_session()
    
    try:
        # Create user
        db_operations.upsert_user(db, {
            'id': user_id,
            'name': name,
            'email': email,
            'password_hash': password_hash_value,
            'login_method': 'local'
        })
        
        # Transfer guest data if exists
        try:
            token = request.cookies.get(Config.COOKIE_NAME)
            if token:
                session = verify_session(token)
                if session:
                    guest_id = session.get('openId')
                    if guest_id and guest_id.startswith('guest_'):
                        db_operations.transfer_guest_data(db, guest_id, user_id)
        except Exception as e:
            print(f"Failed to transfer guest data: {e}")
        
        # Create session token
        session_token = create_session_token(user_id, name, Config.ONE_YEAR_MS)
        
        # Set cookie
        response = make_response(jsonify({
            'id': user_id,
            'email': email
        }), 201)
        
        response.set_cookie(
            Config.COOKIE_NAME,
            session_token,
            max_age=Config.ONE_YEAR_SECONDS,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite='Lax',
            path='/',
            domain=None  # Allow localhost
        )
        
        return response
        
    except Exception as error:
        print(f"Register failed: {error}")
        return jsonify({'error': 'Register failed'}), 500
    finally:
        db.close()


@bp.route('/login', methods=['POST'])
def login():
    """Login with email/password"""
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    db = db_session()
    
    try:
        # Find user by email
        from models import User
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Verify password
        password_hash_str = str(user.password_hash) if user.password_hash is not None else ''
        if not verify_password(password, password_hash_str):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create session token
        user_name = str(user.name) if user.name is not None else None
        session_token = create_session_token(str(user.id), user_name, Config.ONE_YEAR_MS)
        
        # Set cookie
        response = make_response(jsonify({
            'id': user.id,
            'email': user.email
        }), 200)
        
        response.set_cookie(
            Config.COOKIE_NAME,
            session_token,
            max_age=Config.ONE_YEAR_SECONDS,
            httponly=True,
            secure=False,
            samesite='Lax',
            path='/',
            domain=None
        )
        
        return response
        
    except Exception as error:
        print(f"Login failed: {error}")
        return jsonify({'error': 'Login failed'}), 500
    finally:
        db.close()


@bp.route('/firebase', methods=['POST'])
def firebase_auth():
    """Firebase OAuth authentication"""
    data = request.get_json()
    id_token = data.get('idToken')
    
    if not id_token:
        return jsonify({'error': 'Firebase ID token is required'}), 400
    
    # Verify Firebase token
    decoded_token = verify_firebase_token(id_token)
    
    if not decoded_token:
        return jsonify({'error': 'Invalid Firebase token'}), 401
    
    # Extract user info
    firebase_uid = decoded_token.get('uid')
    email = decoded_token.get('email')
    name = decoded_token.get('name') or (email.split('@')[0] if email else 'User')
    profile_image = decoded_token.get('picture')
    provider_id = decoded_token.get('firebase', {}).get('sign_in_provider', 'firebase')
    
    user_id = f"firebase_{firebase_uid}"
    
    db = db_session()
    
    try:
        # Upsert user
        db_operations.upsert_user(db, {
            'id': user_id,
            'name': name,
            'email': email,
            'login_method': provider_id,
            'profile_image': profile_image
        })
        
        # Transfer guest data if exists
        try:
            token = request.cookies.get(Config.COOKIE_NAME)
            if token:
                session = verify_session(token)
                if session:
                    guest_id = session.get('openId')
                    if guest_id and guest_id.startswith('guest_'):
                        db_operations.transfer_guest_data(db, guest_id, user_id)
        except Exception as e:
            print(f"Failed to transfer guest data: {e}")
        
        # Create session token
        session_token = create_session_token(user_id, name, Config.ONE_YEAR_MS)
        
        # Set cookie
        response = make_response(jsonify({
            'success': True,
            'user': {
                'id': user_id,
                'email': email,
                'name': name,
                'profileImage': profile_image
            }
        }), 200)
        
        response.set_cookie(
            Config.COOKIE_NAME,
            session_token,
            max_age=Config.ONE_YEAR_SECONDS,
            httponly=True,
            secure=False,
            samesite='Lax',
            path='/',
            domain=None
        )
        
        return response
        
    except Exception as error:
        print(f"Firebase authentication failed: {error}")
        return jsonify({'error': 'Firebase authentication failed'}), 500
    finally:
        db.close()


@bp.route('/logout', methods=['POST', 'GET'])
def logout():
    """Logout user"""
    response = make_response(jsonify({'success': True}), 200)
    response.set_cookie(
        Config.COOKIE_NAME,
        '',
        max_age=0,
        httponly=True,
        secure=False,
        samesite='Lax',
        path='/',
        domain=None
    )
    return response
