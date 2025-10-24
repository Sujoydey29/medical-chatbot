-- ================================================
-- USE LOCAL EMBEDDINGS (384 dimensions)
-- Run this migration when using EMBEDDING_MODE=LOCAL
-- Uses FREE Sentence-Transformers (all-MiniLM-L6-v2)
-- ================================================

-- Step 1: Drop existing columns completely
ALTER TABLE "patientMemory" DROP COLUMN IF EXISTS "contentEmbedding";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "contentEmbedding";

-- Step 2: Add new columns with LOCAL dimensions (384)
ALTER TABLE "patientMemory" ADD COLUMN "contentEmbedding" vector(384);
ALTER TABLE "messages" ADD COLUMN "contentEmbedding" vector(384);

-- Step 3: Add comments
COMMENT ON COLUMN "patientMemory"."contentEmbedding" IS 
'Vector embedding (384 dimensions) using FREE Sentence-Transformers all-MiniLM-L6-v2 model.';

COMMENT ON COLUMN "messages"."contentEmbedding" IS 
'Vector embedding (384 dimensions) using FREE Sentence-Transformers all-MiniLM-L6-v2 model.';

-- Step 4: Recreate indexes
DROP INDEX IF EXISTS "patientMemory_embedding_idx";
DROP INDEX IF EXISTS "messages_embedding_idx";

CREATE INDEX "patientMemory_embedding_idx" 
ON "patientMemory" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX "messages_embedding_idx" 
ON "messages" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

-- Step 5: Update functions to use vector(384)
DROP FUNCTION IF EXISTS search_similar_patient_memories;
DROP FUNCTION IF EXISTS search_similar_messages;

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

-- Done!
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ LOCAL EMBEDDINGS CONFIGURED (384 dimensions)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Model: all-MiniLM-L6-v2 (FREE)';
    RAISE NOTICE 'Dimensions: 384';
    RAISE NOTICE 'Cost: FREE - No API keys needed!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Set EMBEDDING_MODE=LOCAL in .env';
    RAISE NOTICE '2. Restart Python backend';
    RAISE NOTICE '3. Embeddings will generate automatically';
    RAISE NOTICE '========================================';
END $$;

SELECT * FROM get_embedding_stats();
