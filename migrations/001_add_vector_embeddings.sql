-- ================================================
-- Migration: Add Vector Embeddings to Tables
-- Version: 001
-- Date: 2025-10-23
-- Description: Enable pgvector and add contentEmbedding columns for semantic search
-- ================================================

-- Step 1: Enable pgvector extension
-- This is idempotent - safe to run multiple times
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'pgvector extension failed to install';
    END IF;
END $$;

-- Step 2: Add embedding columns to tables
-- ================================================

-- Add embedding column to patientMemory table
ALTER TABLE "patientMemory" 
ADD COLUMN IF NOT EXISTS "contentEmbedding" vector(1536);

-- Add embedding column to messages table
ALTER TABLE "messages" 
ADD COLUMN IF NOT EXISTS "contentEmbedding" vector(1536);

-- Create comments for documentation
COMMENT ON COLUMN "patientMemory"."contentEmbedding" IS 
'Vector embedding (1536 dimensions) of entity name + relationships for semantic search. Generated using OpenAI text-embedding-3-small.';

COMMENT ON COLUMN "messages"."contentEmbedding" IS 
'Vector embedding (1536 dimensions) of message content for semantic search. Generated using OpenAI text-embedding-3-small.';

-- Step 3: Create IVFFlat indexes for fast similarity search
-- ================================================
-- Lists parameter: sqrt(total_rows) is a good starting point
-- Using 100 for initial deployment (suitable for <10k rows)
-- Adjust based on data growth:
--   - Small dataset (<10k rows): lists = 100
--   - Medium dataset (10k-100k rows): lists = 500
--   - Large dataset (>100k rows): lists = 1000
-- ================================================

CREATE INDEX IF NOT EXISTS "patientMemory_embedding_idx" 
ON "patientMemory" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS "messages_embedding_idx" 
ON "messages" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

-- Step 4: Create Similarity Search Functions
-- ================================================

-- Function: Search Similar Patient Memories
-- Returns top N most similar patient memory entries based on vector similarity
CREATE OR REPLACE FUNCTION search_similar_patient_memories(
    query_embedding vector(1536),
    user_id_param text,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id text,
    user_id text,
    entity_type text,
    entity_name text,
    relationships jsonb,
    metadata jsonb,
    conversation_id text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm."userId",
        pm."entityType",
        pm."entityName",
        pm.relationships::jsonb,
        pm.metadata::jsonb,
        pm."conversationId",
        1 - (pm."contentEmbedding" <=> query_embedding) as similarity
    FROM "patientMemory" pm
    WHERE pm."userId" = user_id_param
        AND pm."contentEmbedding" IS NOT NULL
        AND 1 - (pm."contentEmbedding" <=> query_embedding) > match_threshold
    ORDER BY pm."contentEmbedding" <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function: Search Similar Messages
-- Returns top N most similar messages based on vector similarity
CREATE OR REPLACE FUNCTION search_similar_messages(
    query_embedding vector(1536),
    conversation_id_param text DEFAULT NULL,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id text,
    conversation_id text,
    role text,
    content text,
    citations jsonb,
    search_results jsonb,
    model text,
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m."conversationId",
        m.role,
        m.content,
        m.citations::jsonb,
        m."searchResults"::jsonb,
        m.model,
        m."createdAt",
        1 - (m."contentEmbedding" <=> query_embedding) as similarity
    FROM messages m
    WHERE m."contentEmbedding" IS NOT NULL
        AND (conversation_id_param IS NULL OR m."conversationId" = conversation_id_param)
        AND 1 - (m."contentEmbedding" <=> query_embedding) > match_threshold
    ORDER BY m."contentEmbedding" <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function: Get embedding statistics
-- Useful for monitoring migration progress and data coverage
CREATE OR REPLACE FUNCTION get_embedding_stats()
RETURNS TABLE (
    table_name text,
    total_rows bigint,
    embedded_rows bigint,
    embedding_percentage numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'patientMemory'::text,
        COUNT(*)::bigint,
        COUNT("contentEmbedding")::bigint,
        ROUND((COUNT("contentEmbedding")::numeric / NULLIF(COUNT(*), 0)) * 100, 2)
    FROM "patientMemory"
    UNION ALL
    SELECT 
        'messages'::text,
        COUNT(*)::bigint,
        COUNT("contentEmbedding")::bigint,
        ROUND((COUNT("contentEmbedding")::numeric / NULLIF(COUNT(*), 0)) * 100, 2)
    FROM messages;
END;
$$;

-- Step 5: Verification
-- ================================================

-- Verify columns were added successfully
DO $$
DECLARE
    pm_col_count int;
    msg_col_count int;
BEGIN
    SELECT COUNT(*) INTO pm_col_count
    FROM information_schema.columns
    WHERE table_name = 'patientMemory' AND column_name = 'contentEmbedding';
    
    SELECT COUNT(*) INTO msg_col_count
    FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'contentEmbedding';
    
    IF pm_col_count = 0 THEN
        RAISE EXCEPTION 'Failed to add contentEmbedding column to patientMemory table';
    END IF;
    
    IF msg_col_count = 0 THEN
        RAISE EXCEPTION 'Failed to add contentEmbedding column to messages table';
    END IF;
    
    RAISE NOTICE 'Migration successful! Vector columns added to both tables.';
END $$;

-- Display migration summary
SELECT 
    'Migration Complete' as status,
    COUNT(*) FILTER (WHERE extname = 'vector') as pgvector_enabled,
    COUNT(*) FILTER (WHERE column_name = 'contentEmbedding' AND table_name = 'patientMemory') as patientmemory_column,
    COUNT(*) FILTER (WHERE column_name = 'contentEmbedding' AND table_name = 'messages') as messages_column
FROM 
    pg_extension 
    CROSS JOIN information_schema.columns
WHERE 
    extname = 'vector' 
    OR (table_name IN ('patientMemory', 'messages') AND column_name = 'contentEmbedding');

-- Show embedding statistics
SELECT * FROM get_embedding_stats();
