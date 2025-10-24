"""
Database connection and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import NullPool
from config import Config
from models import Base

# Validate DATABASE_URL exists
if not Config.DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Create database engine
engine = create_engine(
    Config.DATABASE_URL,
    poolclass=NullPool,  # Supabase handles connection pooling
    echo=False  # Set to True for SQL query debugging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create scoped session for thread-safety
db_session = scoped_session(SessionLocal)


def get_db():
    """
    Dependency function to get database session
    Use this in Flask routes with context manager
    """
    db = db_session()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database - create tables if they don't exist
    Note: In production, use Alembic for migrations
    """
    # Import all models to ensure they are registered
    from models import User, Conversation, Message, PatientMemory, UserPreferences
    
    # Create tables (only if they don't exist)
    # Base.metadata.create_all(bind=engine)
    # Note: We're using existing Supabase tables, so we don't create them here
    print("Database initialized - using existing Supabase tables")


def close_db():
    """Close database session"""
    db_session.remove()
