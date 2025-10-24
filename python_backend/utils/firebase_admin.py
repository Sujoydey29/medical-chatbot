"""
Firebase Admin SDK initialization and token verification
Replicates server/_core/firebase-admin.ts
"""

import firebase_admin
from firebase_admin import credentials, auth
from config import Config

firebase_app = None


def initialize_firebase_admin():
    """Initialize Firebase Admin SDK"""
    global firebase_app
    
    if firebase_app:
        return firebase_app
    
    try:
        service_account = Config.FIREBASE_SERVICE_ACCOUNT
        
        if not service_account:
            print('Warning: Firebase Admin - FIREBASE_SERVICE_ACCOUNT_PATH not found in environment')
            return None
        
        cred = credentials.Certificate(service_account)
        firebase_app = firebase_admin.initialize_app(cred)
        
        print('Firebase Admin initialized successfully')
        return firebase_app
    except Exception as error:
        print(f'Failed to initialize Firebase Admin: {error}')
        return None


def get_firebase_admin():
    """Get Firebase Admin instance"""
    if not firebase_app:
        return initialize_firebase_admin()
    return firebase_app


def verify_firebase_token(token: str):
    """
    Verify Firebase ID token
    
    Args:
        token: Firebase ID token string
        
    Returns:
        Decoded token dict or None if verification fails
    """
    try:
        app = get_firebase_admin()
        if not app:
            raise Exception('Firebase Admin not initialized')
        
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as error:
        print(f'Error verifying Firebase token: {error}')
        return None


# Initialize Firebase Admin on module load
initialize_firebase_admin()
