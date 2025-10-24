-- ================================================
-- SIMPLE FIX: Change to 384 dimensions
-- ================================================

-- Step 1: Drop everything
DROP INDEX IF EXISTS "patientMemory_embedding_idx" CASCADE;
DROP INDEX IF EXISTS "messages_embedding_idx" CASCADE;
DROP FUNCTION IF EXISTS search_similar_patient_memories CASCADE;
DROP FUNCTION IF EXISTS search_similar_messages CASCADE;

-- Step 2: Drop columns
ALTER TABLE "messages" DROP COLUMN "contentEmbedding";
ALTER TABLE "patientMemory" DROP COLUMN "contentEmbedding";

-- Step 3: Add new columns with 384 dimensions
ALTER TABLE "messages" ADD COLUMN "contentEmbedding" vector(384);
ALTER TABLE "patientMemory" ADD COLUMN "contentEmbedding" vector(384);

-- Step 4: Recreate indexes
CREATE INDEX "patientMemory_embedding_idx" 
ON "patientMemory" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX "messages_embedding_idx" 
ON "messages" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 100);

-- Step 5: Recreate functions
CREATE FUNCTION search_similar_patient_memories(
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

CREATE FUNCTION search_similar_messages(
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

-- Step 6: Verify
SELECT 
    'messages' as table_name,
    (atttypmod - 4) as dimensions
FROM pg_attribute 
WHERE attrelid = '"messages"'::regclass 
AND attname = 'contentEmbedding'

UNION ALL

SELECT 
    'patientMemory' as table_name,
    (atttypmod - 4) as dimensions
FROM pg_attribute 
WHERE attrelid = '"patientMemory"'::regclass 
AND attname = 'contentEmbedding';
