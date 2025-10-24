-- ================================================
-- Switch to OpenAI Embeddings (1536 dimensions)
-- This migration changes from local 384d to OpenAI 1536d embeddings
-- ================================================

-- Step 1: Drop existing columns completely
ALTER TABLE "patientMemory" DROP COLUMN IF EXISTS "contentEmbedding";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "contentEmbedding";

-- Step 2: Add new columns with OpenAI dimensions (1536)
ALTER TABLE "patientMemory" ADD COLUMN "contentEmbedding" vector(1536);
ALTER TABLE "messages" ADD COLUMN "contentEmbedding" vector(1536);

-- Step 3: Add comments
COMMENT ON COLUMN "patientMemory"."contentEmbedding" IS 
'Vector embedding (1536 dimensions) using OpenAI text-embedding-3-small model.';

COMMENT ON COLUMN "messages"."contentEmbedding" IS 
'Vector embedding (1536 dimensions) using OpenAI text-embedding-3-small model.';

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

-- Step 5: Update functions to use vector(1536)
DROP FUNCTION IF EXISTS search_similar_patient_memories;
DROP FUNCTION IF EXISTS search_similar_messages;

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

-- Done!
DO $$
BEGIN
    RAISE NOTICE '✓ Switched to OpenAI embeddings! Columns now use vector(1536).';
    RAISE NOTICE '✓ Make sure OPENAI_API_KEY is set in your .env file!';
    RAISE NOTICE '✓ All existing embeddings cleared - ready to generate new ones!';
END $$;

SELECT * FROM get_embedding_stats();
