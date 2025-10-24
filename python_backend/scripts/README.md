# Migration Scripts

This directory contains scripts for database migrations and data backfilling.

## Backfill Embeddings Script

### Purpose
Generate vector embeddings for existing messages and patient memories that were created before the vector migration.

### Prerequisites
1. Database migration completed (pgvector extension enabled, vector columns added)
2. Perplexity API key configured in `.env`
3. Python backend dependencies installed (`pip install -r requirements.txt`)

### Usage

```bash
# Navigate to backend directory
cd python_backend

# Run backfill script
python scripts/backfill_embeddings.py
```

### What it does

1. **Shows current embedding coverage statistics**
   - Displays how many records have embeddings vs. total records
   - Shows percentage completion for each table

2. **Backfills message embeddings**
   - Processes messages in batches (default: 100 per batch)
   - Generates 1536-dimensional vectors using Perplexity API
   - Automatically resumes if interrupted

3. **Backfills patient memory embeddings**
   - Processes patient memories in batches
   - Combines entity information with relationships for rich embeddings
   - Tracks progress in real-time

4. **Displays final statistics**
   - Shows total embeddings generated
   - Confirms completion percentage

### Example Output

```
============================================================
  Vector Embedding Backfill Tool
============================================================

This script will generate embeddings for existing data
Using Perplexity API (OpenAI-compatible)

📊 Current Embedding Coverage:
------------------------------------------------------------

messages:
  Total: 1523 | Embedded: 0 (0.0%)
  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]

patientMemory:
  Total: 234 | Embedded: 0 (0.0%)
  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]
------------------------------------------------------------

⚠️  WARNING: This will consume Perplexity API credits!
Approximate cost: $0.02 per 1M tokens (~1000 items)

Continue with backfill? (yes/no): yes

============================================================
  Backfilling Message Embeddings
============================================================

Found 1523 messages without embeddings
Processing in batches of 100...

Processing batch 1... ✓ 100 messages (12.3s) | Remaining: ~1423
Processing batch 2... ✓ 100 messages (11.8s) | Remaining: ~1323
...
Processing batch 16... ✓ 23 messages (3.2s) | Remaining: ~0
✅ Done!

🎉 Successfully processed 1523 messages!

============================================================
  Backfilling Patient Memory Embeddings
============================================================

Found 234 patient memories without embeddings
Processing in batches of 100...

Processing batch 1... ✓ 100 memories (10.5s) | Remaining: ~134
Processing batch 2... ✓ 100 memories (10.2s) | Remaining: ~34
Processing batch 3... ✓ 34 memories (3.7s) | Remaining: ~0
✅ Done!

🎉 Successfully processed 234 patient memories!

📊 Current Embedding Coverage:
------------------------------------------------------------

messages:
  Total: 1523 | Embedded: 1523 (100.0%)
  [████████████████████████████████████████]

patientMemory:
  Total: 234 | Embedded: 234 (100.0%)
  [████████████████████████████████████████]
------------------------------------------------------------

============================================================
  Backfill Complete!
============================================================

✅ Messages updated: 1523
✅ Patient memories updated: 234
✅ Total embeddings generated: 1757
```

### Cost Estimation

- **Model**: text-embedding-3-small
- **Cost**: $0.02 per 1M tokens
- **Average tokens per item**: ~100 tokens

**Example costs:**
- 1,000 messages ≈ 100,000 tokens ≈ $0.002
- 10,000 messages ≈ 1,000,000 tokens ≈ $0.02
- 100,000 messages ≈ 10,000,000 tokens ≈ $0.20

### Error Handling

- **API Rate Limits**: Script includes 0.5s delay between batches
- **Interruption**: Press `Ctrl+C` to stop - progress is saved
- **Resume**: Run script again to continue from where it stopped
- **Failures**: Individual item failures are logged but don't stop the batch

### Troubleshooting

#### Error: "OpenAI API key is required"
**Solution**: Ensure `PERPLEXITY_API_KEY` is set in `.env`

#### Error: "pgvector extension not found"
**Solution**: Run database migration first (`migrations/001_add_vector_embeddings.sql`)

#### Error: "Rate limit exceeded"
**Solution**: Wait a few minutes and run script again - it will resume

#### Script runs but no updates
**Solution**: All data may already have embeddings - check statistics output

### Advanced Usage

#### Custom Batch Size

Edit the script to change batch size:

```python
# In backfill_embeddings.py
messages_updated = backfill_all_messages(db, batch_size=50)  # Smaller batches
```

#### Backfill Specific User

Modify `backfill_patient_memory_embeddings` call:

```python
updated = backfill_patient_memory_embeddings(db, batch_size=100, user_id="user_123")
```

#### Check Statistics Only

```bash
python -c "from database import get_db; from services.db_operations import get_embedding_statistics; print(get_embedding_statistics(next(get_db())))"
```

### Maintenance

- **Re-run periodically**: If old data is modified, re-run to update embeddings
- **Monitor coverage**: Use `/api/vector/embeddings/stats` endpoint
- **Incremental backfill**: API endpoints allow users to backfill their own data

### Related Files

- `services/db_operations.py` - Contains backfill functions
- `services/embedding_service.py` - Generates embeddings
- `migrations/001_add_vector_embeddings.sql` - Database schema migration

### Next Steps

After backfilling:
1. Test vector search: `/api/vector/search/memories`
2. Verify embeddings in Supabase dashboard
3. Check token reduction in Perplexity integration
4. Monitor performance improvements
