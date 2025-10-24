"""
Configuration module for MedChat Python Backend
Loads environment variables and provides configuration settings
"""

import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file in parent directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)


class Config:
    """Application configuration class"""
    
    # Application Info
    APP_ID = os.getenv('VITE_APP_ID', 'medchat-app')
    APP_TITLE = os.getenv('VITE_APP_TITLE', 'MedChat - Medical AI Assistant')
    
    # Security
    JWT_SECRET = os.getenv('JWT_SECRET', 'your-jwt-secret-change-in-production')
    
    # Server
    PORT = int(os.getenv('PORT', 3000))
    
    # Perplexity API (for chat)
    PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')
    
    # OpenAI API (for embeddings)
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # Embedding Mode: LOCAL or OPENAI
    EMBEDDING_MODE = os.getenv('EMBEDDING_MODE', 'LOCAL').upper()
    
    # Supabase Database
    DATABASE_URL = os.getenv('DATABASE_URL')
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
    
    # Firebase Configuration (for authentication)
    FIREBASE_SERVICE_ACCOUNT = None
    
    @classmethod
    def load_firebase_service_account(cls):
        """Load Firebase service account from environment variable"""
        service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        if service_account_json:
            try:
                cls.FIREBASE_SERVICE_ACCOUNT = json.loads(service_account_json)
            except json.JSONDecodeError:
                print("Warning: Failed to parse FIREBASE_SERVICE_ACCOUNT_PATH")
        return cls.FIREBASE_SERVICE_ACCOUNT
    
    # Cookie settings
    COOKIE_NAME = 'app_session_id'
    ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365
    ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
    
    # CORS settings - Updated for Vite frontend
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001']


# Initialize Firebase service account on module load
Config.load_firebase_service_account()
