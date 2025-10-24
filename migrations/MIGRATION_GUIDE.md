# Vector Migration Guide

## Overview
This guide walks you through executing the vector embeddings migration on your Supabase database.

## Prerequisites
- [ ] Supabase project with database access
- [ ] Database backup completed (recommended)
- [ ] PostgreSQL 14+ with pgvector extension support

## Migration Steps

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **+ New query**

### Step 2: Execute Migration Script

1. Open the migration file: `migrations/001_add_vector_embeddings.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

**Expected Output:**
```
Migration successful! Vector columns added to both tables.
status: Migration Complete
pgvector_enabled: 1
patientmemory_column: 1  
messages_column: 1

table_name        | total_rows | embedded_rows | embedding_percentage
------------------+------------+---------------+---------------------
patientMemory     | X          | 0             | 0.00
messages          | Y          | 0             | 0.00
```

> Note: `embedded_rows` will be 0 initially. This will increase as you generate embeddings for existing data.

### Step 3: Verify Migration Success

Run the following verification queries in SQL Editor:

```sql
-- 1. Check pgvector extension is enabled
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- 2. Verify columns were added
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name IN ('patientMemory', 'messages')
  AND column_name = 'contentEmbedding';

-- 3. Verify indexes were created
SELECT indexname, tablename 
FROM pg_indexes
WHERE indexname LIKE '%embedding%';

-- 4. Test similarity search function (will return empty until embeddings are generated)
SELECT * FROM get_embedding_stats();
```

### Step 4: Update Python Backend

The Python models have been updated to include vector fields. No manual action needed - the updated `models.py` includes:

- `PatientMemory.content_embedding` field
- `Message.content_embedding` field
- Vector type support via `pgvector.sqlalchemy.Vector`

### Step 5: Install Python Dependencies

Run in your terminal:

```bash
cd python_backend
pip install pgvector
```

This installs the `pgvector` Python library needed for vector operations.

## Post-Migration Tasks

After successful migration, proceed with:

1. **Step 4:** Update Python models (already done in `models.py`)
2. **Step 5:** Create embedding service for generating vectors
3. **Step 6:** Update database operations to generate embeddings
4. **Step 7:** Implement vector similarity search
5. **Step 9:** Backfill embeddings for existing data

## Rollback (If Needed)

If you encounter issues and need to rollback:

1. Open `migrations/001_rollback_vector_embeddings.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**

**WARNING:** Rollback will permanently delete all embedding data!

## Troubleshooting

### Error: "pgvector extension not available"

**Solution:** Enable pgvector via Supabase Dashboard:
1. Navigate to **Database** → **Extensions**
2. Search for "vector"
3. Click **Enable** on `vector` extension
4. Re-run migration

### Error: "column already exists"

**Solution:** Migration is idempotent. This error is safe to ignore if columns were previously created.

### Error: "index already exists"

**Solution:** Migration is idempotent. This error is safe to ignore if indexes were previously created.

### Performance Issues After Migration

If similarity searches are slow:

1. Check index usage:
```sql
EXPLAIN ANALYZE 
SELECT * FROM search_similar_patient_memories(
    '[0.1, 0.2, ...]'::vector(1536),
    'user_id_here',
    0.7,
    5
);
```

2. Adjust `lists` parameter based on data size:
```sql
-- For medium dataset (10k-100k rows)
DROP INDEX "patientMemory_embedding_idx";
CREATE INDEX "patientMemory_embedding_idx" 
ON "patientMemory" 
USING ivfflat ("contentEmbedding" vector_cosine_ops)
WITH (lists = 500);
```

## Monitoring Migration Progress

Track embedding generation progress:

```sql
-- Check percentage of rows with embeddings
SELECT * FROM get_embedding_stats();

-- Check recent embeddings
SELECT 
    id, 
    "entityName", 
    CASE WHEN "contentEmbedding" IS NULL THEN 'No' ELSE 'Yes' END as has_embedding
FROM "patientMemory"
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Next Steps

Once migration is verified successful:

- [ ] Mark Step 3 as COMPLETE
- [ ] Proceed to Step 4: Update Python models (✓ Already done)
- [ ] Proceed to Step 5: Create embedding service
- [ ] Test embedding generation with sample data
- [ ] Plan backfill strategy for existing records

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs/guides/database/extensions/pgvector
- Check pgvector documentation: https://github.com/pgvector/pgvector
