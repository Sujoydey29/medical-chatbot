-- ================================================
-- FORCE UPDATE TO 384 DIMENSIONS
-- This script forcefully ensures database uses 384d
-- ================================================

-- First, let's see what we have
DO $$
DECLARE
    messages_type text;
    patient_type text;
BEGIN
    -- Check current dimensions
    SELECT atttypmod INTO messages_type 
    FROM pg_attribute 
    WHERE attrelid = '"messages"'::regclass 
    AND attname = 'contentEmbedding';
    
    SELECT atttypmod INTO patient_type 
    FROM pg_attribute 
    WHERE attrelid = '"patientMemory"'::regclass 
    AND attname = 'contentEmbedding';
    
    RAISE NOTICE 'Current messages dimension: %', messages_type;
    RAISE NOTICE 'Current patientMemory dimension: %', patient_type;
END $$;

-- Drop and recreate with explicit casting
ALTER TABLE "messages" DROP COLUMN IF EXISTS "contentEmbedding" CASCADE;
ALTER TABLE "patientMemory" DROP COLUMN IF EXISTS "contentEmbedding" CASCADE;

-- Add columns with explicit 384 dimensions
ALTER TABLE "messages" ADD COLUMN "contentEmbedding" vector(384);
ALTER TABLE "patientMemory" ADD COLUMN "contentEmbedding" vector(384);

-- Verify the change
DO $$
DECLARE
    messages_dim integer;
    patient_dim integer;
BEGIN
    SELECT atttypmod - 4 INTO messages_dim 
    FROM pg_attribute 
    WHERE attrelid = '"messages"'::regclass 
    AND attname = 'contentEmbedding';
    
    SELECT atttypmod - 4 INTO patient_dim 
    FROM pg_attribute 
    WHERE attrelid = '"patientMemory"'::regclass 
    AND attname = 'contentEmbedding';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION:';
    RAISE NOTICE 'messages.contentEmbedding: % dimensions', messages_dim;
    RAISE NOTICE 'patientMemory.contentEmbedding: % dimensions', patient_dim;
    
    IF messages_dim = 384 AND patient_dim = 384 THEN
        RAISE NOTICE '✓ SUCCESS! Both tables now use 384 dimensions';
    ELSE
        RAISE NOTICE '⚠ WARNING! Dimensions may not be updated correctly';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- Recreate indexes
DROP INDEX IF EXISTS "patientMemory_embedding_idx" CASCADE;
DROP INDEX IF EXISTS "messages_embedding_idx" CASCADE;

CREATE INDEX "patientMemory_embedding_idx" 
ON "patientMemory" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX "messages_embedding_idx" 
ON "messages" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

-- Drop and recreate functions with 384d vectors
DROP FUNCTION IF EXISTS search_similar_patient_memories CASCADE;
DROP FUNCTION IF EXISTS search_similar_messages CASCADE;

CREATE OR REPLACE FUNCTION search_similar_patient_memories(
    query_embedding vector(384),
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

CREATE OR REPLACE FUNCTION search_similar_messages(
    query_embedding vector(384),
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

-- Final check
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ FORCE UPDATE COMPLETE!';
    RAISE NOTICE 'Database is now configured for 384 dimensions';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Restart Python backend';
    RAISE NOTICE '2. Test sending a message';
    RAISE NOTICE '3. Verify no dimension errors';
    RAISE NOTICE '========================================';
END $$;

-- Show final stats
SELECT * FROM get_embedding_stats();
