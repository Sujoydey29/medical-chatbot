# Embedding Service Documentation

## Overview

The `EmbeddingService` is a Python service that generates vector embeddings using OpenAI's `text-embedding-3-small` model. These embeddings enable semantic search and similarity matching for patient memory and chat messages.

---

## Features

✅ **Single & Batch Embedding Generation** - Generate embeddings for one or many texts efficiently  
✅ **Domain-Specific Generators** - Specialized methods for patient memory and messages  
✅ **Automatic Truncation** - Handles long texts gracefully  
✅ **Batch Processing** - Efficient chunking for large datasets  
✅ **Cosine Similarity** - Built-in similarity calculation  
✅ **PostgreSQL Integration** - Convert vectors to/from database format  
✅ **Singleton Pattern** - Easy global access  

---

## Installation

### 1. Install Dependencies

```bash
pip install openai pgvector
```

### 2. Set Environment Variable

Add to your `.env` file:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

---

## Quick Start

### Basic Usage

```python
from services.embedding_service import get_embedding_service

# Get service instance
service = get_embedding_service()

# Generate single embedding
embedding = service.generate_embedding("Patient has fever and cough")
print(f"Embedding dimensions: {len(embedding)}")  # Output: 1536

# Generate batch embeddings
texts = ["Symptom 1", "Symptom 2", "Symptom 3"]
embeddings = service.generate_embeddings_batch(texts)
print(f"Generated {len(embeddings)} embeddings")
```

### Convenience Functions

```python
from services.embedding_service import generate_embedding, generate_embeddings_batch

# Direct function calls (uses singleton instance)
embedding = generate_embedding("Quick text")
embeddings = generate_embeddings_batch(["Text 1", "Text 2"])
```

---

## API Reference

### Core Methods

#### `generate_embedding(text: str) -> List[float]`

Generate embedding vector for a single text string.

**Parameters:**
- `text` (str): Input text to embed

**Returns:**
- `List[float]`: 1536-dimensional embedding vector

**Raises:**
- `ValueError`: If text is empty
- `Exception`: If OpenAI API call fails

**Example:**
```python
embedding = service.generate_embedding("Patient reports headache")
# Returns: [0.123, -0.456, 0.789, ... ] (1536 floats)
```

---

#### `generate_embeddings_batch(texts: List[str]) -> List[List[float]]`

Generate embeddings for multiple texts in a single API call.

**Parameters:**
- `texts` (List[str]): List of text strings (max 2048 per batch)

**Returns:**
- `List[List[float]]`: List of embedding vectors in same order as input

**Raises:**
- `ValueError`: If texts list is empty or all texts are empty

**Features:**
- Automatically filters out empty strings
- Chunks large batches (>2048 texts) automatically
- More efficient than multiple `generate_embedding()` calls

**Example:**
```python
texts = [
    "Patient history: Diabetes",
    "Current symptoms: Fatigue",
    "Medication: Metformin"
]

embeddings = service.generate_embeddings_batch(texts)
# Returns: [[...], [...], [...]] (3 x 1536 vectors)
```

---

### Domain-Specific Methods

#### `generate_patient_memory_embedding(...)`

Generate embedding optimized for patient memory entries.

```python
def generate_patient_memory_embedding(
    entity_name: str,
    entity_type: str,
    relationships: Optional[List[Dict[str, Any]]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> List[float]
```

**Parameters:**
- `entity_name` (str): Entity name (e.g., "Diabetes Type 2")
- `entity_type` (str): Entity type (e.g., "condition", "symptom", "medication")
- `relationships` (Optional[List[Dict]]): Relationship objects
- `metadata` (Optional[Dict]): Additional metadata

**Example:**
```python
embedding = service.generate_patient_memory_embedding(
    entity_name="Diabetes Type 2",
    entity_type="condition",
    relationships=[
        {
            "type": "treated_with",
            "relatedEntity": "Metformin",
            "strength": "strong"
        },
        {
            "type": "causes",
            "relatedEntity": "High blood sugar",
            "strength": "direct"
        }
    ],
    metadata={
        "description": "Chronic metabolic disorder",
        "severity": "moderate",
        "status": "ongoing"
    }
)
```

**Text Representation:**
The method automatically creates a comprehensive text:
```
"condition: Diabetes Type 2. Relationships: treated_with Metformin, causes High blood sugar. Description: Chronic metabolic disorder. Severity: moderate. Status: ongoing"
```

---

#### `generate_message_embedding(...)`

Generate embedding optimized for chat messages.

```python
def generate_message_embedding(
    content: str,
    role: str = "assistant",
    citations: Optional[List[str]] = None,
    search_results: Optional[List[Dict[str, Any]]] = None
) -> List[float]
```

**Parameters:**
- `content` (str): Message text content
- `role` (str): Message role ("user", "assistant", "system")
- `citations` (Optional[List[str]]): Citation URLs
- `search_results` (Optional[List[Dict]]): Search result objects

**Example:**
```python
embedding = service.generate_message_embedding(
    content="Based on your symptoms, you may have a common cold.",
    role="assistant",
    search_results=[
        {
            "snippet": "Common cold symptoms include runny nose, cough, and sore throat"
        },
        {
            "snippet": "Typical duration is 7-10 days"
        }
    ]
)
```

---

### Utility Methods

#### `cosine_similarity(vec1, vec2) -> float`

Calculate cosine similarity between two vectors.

**Parameters:**
- `vec1` (List[float]): First embedding vector
- `vec2` (List[float]): Second embedding vector

**Returns:**
- `float`: Similarity score between 0 and 1 (1 = identical)

**Example:**
```python
emb1 = service.generate_embedding("Patient has fever")
emb2 = service.generate_embedding("Patient reports high temperature")

similarity = EmbeddingService.cosine_similarity(emb1, emb2)
print(f"Similarity: {similarity:.2%}")  # e.g., "Similarity: 87.5%"
```

---

#### `vector_to_string(embedding) -> str`

Convert embedding vector to PostgreSQL-compatible string.

**Example:**
```python
embedding = [0.1, 0.2, 0.3]
pg_string = EmbeddingService.vector_to_string(embedding)
print(pg_string)  # Output: "[0.1,0.2,0.3]"
```

---

#### `string_to_vector(embedding_str) -> List[float]`

Convert PostgreSQL vector string back to list of floats.

**Example:**
```python
pg_string = "[0.1,0.2,0.3]"
embedding = EmbeddingService.string_to_vector(pg_string)
print(embedding)  # Output: [0.1, 0.2, 0.3]
```

---

## Integration with Database

### Storing Embeddings

```python
from services.embedding_service import get_embedding_service
from services.db_operations import DatabaseOperations
from database import get_db

service = get_embedding_service()
db_ops = DatabaseOperations(next(get_db()))

# Generate embedding
text = "Patient reports chest pain"
embedding = service.generate_embedding(text)

# Store in database (PostgreSQL with pgvector)
from sqlalchemy import text

query = text("""
    UPDATE messages 
    SET "contentEmbedding" = :embedding 
    WHERE id = :message_id
""")

db_ops.db.execute(query, {
    "embedding": embedding,  # pgvector handles list conversion
    "message_id": "msg_123"
})
db_ops.db.commit()
```

### Similarity Search

```python
# Generate query embedding
query_text = "chest pain symptoms"
query_embedding = service.generate_embedding(query_text)

# Search similar messages using PostgreSQL function
from sqlalchemy import text

search_query = text("""
    SELECT * FROM search_similar_messages(
        :query_embedding::vector(1536),
        NULL,  -- conversation_id (NULL = search all)
        0.7,   -- similarity threshold
        10     -- max results
    )
""")

results = db_ops.db.execute(search_query, {
    "query_embedding": query_embedding
}).fetchall()

for row in results:
    print(f"Message: {row.content}")
    print(f"Similarity: {row.similarity:.2%}")
```

---

## Best Practices

### 1. Use Batch Generation for Multiple Items

❌ **Bad:**
```python
embeddings = []
for text in texts:
    embeddings.append(service.generate_embedding(text))
```

✅ **Good:**
```python
embeddings = service.generate_embeddings_batch(texts)
```

**Why?** Batch API calls are ~10x faster and more cost-effective.

---

### 2. Cache Embeddings

❌ **Bad:**
```python
# Generate embedding every time
def search_similar(query):
    embedding = generate_embedding(query)
    # ... search
```

✅ **Good:**
```python
# Store embeddings in database
def store_message(message_id, content):
    embedding = generate_embedding(content)
    db.execute("UPDATE messages SET contentEmbedding = :emb WHERE id = :id",
               {"emb": embedding, "id": message_id})
```

**Why?** Embedding generation has API cost and latency. Cache results.

---

### 3. Handle Long Text

✅ **Good:**
```python
# Service automatically truncates to MAX_TOKENS
embedding = service.generate_embedding(very_long_text)
```

**Note:** Text longer than ~32,000 characters is automatically truncated.

---

### 4. Error Handling

✅ **Good:**
```python
try:
    embedding = service.generate_embedding(user_input)
except ValueError as e:
    print(f"Invalid input: {e}")
except Exception as e:
    print(f"API error: {e}")
    # Use fallback or retry logic
```

---

## Performance

### Token Limits

| Model | Max Tokens | Approximate Characters |
|-------|-----------|------------------------|
| text-embedding-3-small | 8,191 | ~32,000 |

### Batch Size Limits

- **Max texts per batch:** 2,048
- **Automatic chunking:** For >2,048 texts, service automatically chunks

### Cost (as of 2024)

| Model | Dimensions | Cost per 1M tokens |
|-------|-----------|-------------------|
| text-embedding-3-small | 1536 | $0.02 |

**Example:** Embedding 1,000 messages (avg 100 tokens each) = 100,000 tokens ≈ $0.002

---

## Troubleshooting

### Error: "OpenAI API key is required"

**Solution:** Set `OPENAI_API_KEY` environment variable

```bash
export OPENAI_API_KEY=sk-your-key-here
```

Or add to `.env` file.

---

### Error: "Text cannot be empty"

**Solution:** Validate input before calling service

```python
if text and text.strip():
    embedding = service.generate_embedding(text)
```

---

### Error: Rate limit exceeded

**Solution:** Implement retry logic with exponential backoff

```python
import time

def generate_with_retry(text, max_retries=3):
    for attempt in range(max_retries):
        try:
            return service.generate_embedding(text)
        except Exception as e:
            if "rate_limit" in str(e).lower():
                wait_time = 2 ** attempt
                print(f"Rate limited, waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise
    raise Exception("Max retries exceeded")
```

---

## Testing

### Run Unit Tests

```bash
cd python_backend/services
pytest test_embedding_service.py -v
```

### Run Integration Tests (requires API key)

```bash
pytest test_embedding_service.py -v --run-integration
```

---

## Advanced Usage

### Custom Similarity Threshold

```python
# Find highly similar items (>90% similarity)
high_threshold_results = db.execute("""
    SELECT * FROM search_similar_patient_memories(
        :query_embedding::vector(1536),
        :user_id,
        0.9,  -- High threshold
        5
    )
""", {"query_embedding": query_emb, "user_id": user_id})
```

### Combine with Traditional Filters

```python
# Search similar messages within specific conversation
results = db.execute("""
    SELECT * FROM search_similar_messages(
        :query_embedding::vector(1536),
        :conversation_id,  -- Filter by conversation
        0.7,
        10
    )
""", {
    "query_embedding": query_emb,
    "conversation_id": "conv_123"
})
```

---

## Next Steps

- ✅ Step 5 Complete: Embedding service created
- 🔄 Step 6: Update `db_operations.py` to use embedding service
- 🔄 Step 7: Implement vector search in API endpoints
- 🔄 Step 8: Integrate with Perplexity API for context

---

## Support

For issues or questions:
- OpenAI Embeddings Docs: https://platform.openai.com/docs/guides/embeddings
- pgvector Docs: https://github.com/pgvector/pgvector
