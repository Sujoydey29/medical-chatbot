"""
Authentication utilities
JWT token handling and password hashing
Replicates server/_core/sdk.ts authentication functions
"""

import jwt
import bcrypt
from datetime import datetime, timedelta
from config import Config
from nanoid import generate


from typing import Optional


def create_session_token(user_id: str, name: Optional[str] = None, expires_in_ms: Optional[int] = None) -> str:
    """
    Create JWT session token
    
    Args:
        user_id: User ID (openId)
        name: User name (optional)
        expires_in_ms: Expiration time in milliseconds (optional)
        
    Returns:
        JWT token string
    """
    if expires_in_ms is None:
        expires_in_ms = Config.ONE_YEAR_MS
    
    # Convert milliseconds to seconds
    expires_in_seconds = expires_in_ms // 1000
    
    payload = {
        'openId': user_id,
        'name': name,
        'exp': datetime.utcnow() + timedelta(seconds=expires_in_seconds),
        'iat': datetime.utcnow()
    }
    
    token = jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')
    return token


def verify_session(token: str):
    """
    Verify JWT session token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload dict or None if verification fails
    """
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        print('Token expired')
        return None
    except jwt.InvalidTokenError as e:
        print(f'Invalid token: {e}')
        return None


def hash_password(password: str) -> str:
    """
    Hash password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: Optional[str] = None) -> bool:
    """
    Verify password against hash
    
    Args:
        password: Plain text password
        password_hash: Hashed password
        
    Returns:
        True if password matches, False otherwise
    """
    if not password_hash:
        return False
    
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception as e:
        print(f'Error verifying password: {e}')
        return False


def generate_id(prefix: str = '', length: int = 8) -> str:
    """
    Generate unique ID using nanoid
    
    Args:
        prefix: Optional prefix for ID
        length: Length of random portion
        
    Returns:
        Generated ID string
    """
    random_id = generate(size=length)
    if prefix:
        return f"{prefix}_{random_id}"
    return random_id
