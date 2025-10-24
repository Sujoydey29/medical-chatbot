-- ================================================
-- Migration: Update Vector Dimensions 1536 → 384
-- Version: 002
-- Date: 2025-10-23
-- Description: Update embeddings to use FREE Sentence-Transformers (384 dimensions)
-- ================================================

-- Step 1: Drop existing indexes (need to recreate with new dimensions)
DROP INDEX IF EXISTS "patientMemory_embedding_idx";
DROP INDEX IF EXISTS "messages_embedding_idx";

-- Step 2: Drop existing functions (need to update signatures)
DROP FUNCTION IF EXISTS search_similar_patient_memories;
DROP FUNCTION IF EXISTS search_similar_messages;

-- Step 3: Update column types from vector(1536) to vector(384)
ALTER TABLE "patientMemory" 
DROP COLUMN IF EXISTS "contentEmbedding";

ALTER TABLE "patientMemory" 
ADD COLUMN "contentEmbedding" vector(384);

ALTER TABLE "messages" 
DROP COLUMN IF EXISTS "contentEmbedding";

ALTER TABLE "messages" 
ADD COLUMN "contentEmbedding" vector(384);

-- Step 4: Update comments
COMMENT ON COLUMN "patientMemory"."contentEmbedding" IS 
'Vector embedding (384 dimensions) of entity name + relationships for semantic search. Generated using FREE Sentence-Transformers all-MiniLM-L6-v2 model.';

COMMENT ON COLUMN "messages"."contentEmbedding" IS 
'Vector embedding (384 dimensions) of message content for semantic search. Generated using FREE Sentence-Transformers all-MiniLM-L6-v2 model.';

-- Step 5: Recreate indexes with new dimensions
CREATE INDEX "patientMemory_embedding_idx" 
ON "patientMemory" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX "messages_embedding_idx" 
ON "messages" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

-- Step 6: Recreate functions with vector(384)
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

-- Step 7: Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration successful! Vector dimensions updated from 1536 to 384.';
    RAISE NOTICE 'Now using FREE Sentence-Transformers all-MiniLM-L6-v2 model.';
    RAISE NOTICE 'All existing embeddings have been cleared - regenerate using the new model.';
END $$;

-- Show stats
SELECT * FROM get_embedding_stats();
