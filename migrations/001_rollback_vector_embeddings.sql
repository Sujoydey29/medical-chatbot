-- ================================================
-- Rollback Migration: Remove Vector Embeddings
-- Version: 001_rollback
-- Date: 2025-10-23
-- Description: Rollback script to remove vector embeddings if needed
-- WARNING: This will delete all embedding data
-- ================================================

-- Step 1: Drop indexes first
-- ================================================

DROP INDEX IF EXISTS "patientMemory_embedding_idx";
DROP INDEX IF EXISTS "messages_embedding_idx";

-- Step 2: Drop functions
-- ================================================

DROP FUNCTION IF EXISTS search_similar_patient_memories(vector, text, float, int);
DROP FUNCTION IF EXISTS search_similar_messages(vector, text, float, int);
DROP FUNCTION IF EXISTS get_embedding_stats();

-- Step 3: Drop columns
-- ================================================
-- WARNING: This permanently deletes all embedding data

ALTER TABLE "patientMemory" DROP COLUMN IF EXISTS "contentEmbedding";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "contentEmbedding";

-- Step 4: (Optional) Disable pgvector extension
-- ================================================
-- CAUTION: Only disable if no other tables/features use pgvector
-- Uncomment the following line only if you're sure you want to remove pgvector completely

-- DROP EXTENSION IF EXISTS vector CASCADE;

-- Verification
-- ================================================

SELECT 
    'Rollback Complete' as status,
    COUNT(*) FILTER (WHERE column_name = 'contentEmbedding' AND table_name = 'patientMemory') as patientmemory_column_exists,
    COUNT(*) FILTER (WHERE column_name = 'contentEmbedding' AND table_name = 'messages') as messages_column_exists
FROM information_schema.columns
WHERE table_name IN ('patientMemory', 'messages') AND column_name = 'contentEmbedding';

-- Should return 0 for both columns if rollback was successful
