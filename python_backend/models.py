"""
Database models using SQLAlchemy
Replicates the Drizzle schema from drizzle/schema.ts
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from pgvector.sqlalchemy import Vector

Base = declarative_base()


class User(Base):
    """User table - core user authentication and profile"""
    __tablename__ = 'users'
    
    id = Column(String(64), primary_key=True)
    name = Column(Text, nullable=True)
    email = Column(String(320), nullable=True)
    password_hash = Column('passwordHash', Text, nullable=True)
    login_method = Column('loginMethod', String(64), nullable=True)
    role = Column(String(32), nullable=False, default='user')
    
    # Profile fields
    profile_image = Column('profileImage', Text, nullable=True)
    bio = Column(Text, nullable=True)
    date_of_birth = Column('dateOfBirth', Text, nullable=True)
    phone = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    
    created_at = Column('createdAt', DateTime(timezone=True), server_default=func.now())
    last_signed_in = Column('lastSignedIn', DateTime(timezone=True), server_default=func.now())


class Conversation(Base):
    """Conversations table - stores chat sessions"""
    __tablename__ = 'conversations'
    
    id = Column(String(64), primary_key=True)
    user_id = Column('userId', String(64), nullable=True)
    title = Column(Text, nullable=False)
    is_guest = Column('isGuest', Boolean, nullable=False, default=False)
    created_at = Column('createdAt', DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column('updatedAt', DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('conversations_userId_idx', 'userId'),
    )


class Message(Base):
    """Messages table - stores individual chat messages"""
    __tablename__ = 'messages'
    
    id = Column(String(64), primary_key=True)
    conversation_id = Column('conversationId', String(64), nullable=False)
    role = Column(String(32), nullable=False)
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)  # Array of citation URLs
    search_results = Column('searchResults', JSON, nullable=True)  # Array of search result objects
    content_embedding = Column('contentEmbedding', Vector(384), nullable=True)  # Vector embedding for semantic search (LOCAL mode)
    model = Column(String(64), nullable=True)
    created_at = Column('createdAt', DateTime(timezone=True), nullable=False, server_default=func.now())
    
    __table_args__ = (
        Index('conversationId_idx', 'conversationId'),
    )


class PatientMemory(Base):
    """Patient memory table - stores knowledge graph for logged-in users"""
    __tablename__ = 'patientMemory'
    
    id = Column(String(64), primary_key=True)
    user_id = Column('userId', String(64), nullable=False)
    entity_type = Column('entityType', String(64), nullable=False)
    entity_name = Column('entityName', Text, nullable=False)
    relationships = Column(JSON, nullable=True)  # Array of relationship objects
    entity_metadata = Column('metadata', JSON, nullable=True)  # Additional context (mapped to 'metadata' column)
    content_embedding = Column('contentEmbedding', Vector(384), nullable=True)  # Vector embedding for semantic search (LOCAL mode)
    conversation_id = Column('conversationId', String(64), nullable=True)
    created_at = Column('createdAt', DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column('updatedAt', DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('patientMemory_userId_idx', 'userId'),
    )


class UserPreferences(Base):
    """User preferences table - stores model selection and settings"""
    __tablename__ = 'userPreferences'
    
    id = Column(String(64), primary_key=True)
    user_id = Column('userId', String(64), nullable=False, unique=True)
    preferred_model = Column('preferredModel', String(64), default='sonar-pro')
    theme = Column(String(16), default='light')
    
    # Bot personality settings
    age_group = Column('ageGroup', String(32), default='middle-aged')
    response_style = Column('responseStyle', String(32), default='professional')
    language_complexity = Column('languageComplexity', String(32), default='moderate')
    include_medical_terms = Column('includeMedicalTerms', Boolean, default=True)
    response_length = Column('responseLength', String(32), default='concise')
    
    created_at = Column('createdAt', DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column('updatedAt', DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
