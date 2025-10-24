# MedChat Python Backend

## Overview
This is the Python (Flask) backend for MedChat Medical AI Assistant, replacing the Node.js/Express/tRPC backend.

## Technology Stack
- **Framework**: Flask 3.0.0
- **Database**: PostgreSQL (Supabase) with SQLAlchemy
- **Authentication**: Firebase Admin SDK + JWT
- **AI Integration**: OpenAI Python SDK (for Perplexity API)

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd python_backend
pip install -r requirements.txt
```

### 2. Environment Variables
The application uses the `.env` file in the parent directory. No changes needed to `.env`.

### 3. Run the Server

```bash
python app.py
```

The server will start on `http://localhost:3000`

## Project Structure

```
python_backend/
├── app.py                  # Main Flask application
├── config.py               # Configuration and environment variables
├── models.py               # SQLAlchemy database models
├── database.py             # Database connection and session management
├── requirements.txt        # Python dependencies
├── utils/
│   ├── __init__.py
│   ├── auth.py            # JWT and password utilities
│   └── firebase_admin.py  # Firebase Admin SDK
├── routes/                # API routes (to be created)
│   ├── __init__.py
│   ├── auth.py           # Authentication endpoints
│   ├── conversations.py  # Conversation management
│   ├── chat.py           # Chat endpoints
│   ├── memory.py         # Memory management
│   ├── profile.py        # User profile
│   └── preferences.py    # User preferences
└── services/              # Business logic (to be created)
    ├── __init__.py
    ├── perplexity.py     # Perplexity API integration
    └── db_operations.py  # Database operations
```

## API Endpoints (To Be Implemented)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/firebase` - Firebase OAuth authentication
- `GET /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations` - List user conversations
- `GET /api/conversations/<id>` - Get conversation with messages
- `PUT /api/conversations/<id>` - Update conversation title
- `DELETE /api/conversations/<id>` - Delete conversation

### Chat
- `POST /api/chat/send` - Send message and get AI response
- `GET /api/chat/models` - Get available models

### Memory
- `GET /api/memory` - Get patient memory
- `DELETE /api/memory/<id>` - Delete specific memory
- `POST /api/memory/clear` - Clear all patient memory

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Preferences
- `GET /api/preferences` - Get user preferences
- `PUT /api/preferences` - Update user preferences

## Migration Status

### ✅ Completed (Step 1)
- [x] Project structure created
- [x] Dependencies defined (requirements.txt)
- [x] Configuration module (config.py)
- [x] Database models (models.py)
- [x] Database connection (database.py)
- [x] Firebase Admin setup (utils/firebase_admin.py)
- [x] Authentication utilities (utils/auth.py)
- [x] Main Flask app (app.py)

### 🔄 In Progress
- [ ] Database operations (services/db_operations.py)
- [ ] Perplexity API integration (services/perplexity.py)
- [ ] API routes implementation
- [ ] Testing with Postman

### 📋 TODO (Next Steps)
- [ ] Step 2: Database operations layer
- [ ] Step 3: Perplexity API integration
- [ ] Step 4: Authentication routes
- [ ] Step 5: Conversation routes
- [ ] Step 6: Chat routes
- [ ] Step 7: Memory routes
- [ ] Step 8: Profile routes
- [ ] Step 9: Preferences routes
- [ ] Step 10: Testing and validation

## Notes
- The `.env` file remains unchanged
- Database tables already exist in Supabase (created by Drizzle)
- SQLAlchemy models map to existing tables
- No database migrations needed for now
