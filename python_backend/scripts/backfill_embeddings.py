#!/usr/bin/env python3
"""
Backfill Embeddings Script
Generates vector embeddings for existing messages and patient memories
Run this script after database migration to populate embeddings for existing data
"""

import sys
import os

# Add parent directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from services.db_operations import (
    backfill_message_embeddings,
    backfill_patient_memory_embeddings,
    get_embedding_statistics
)
from sqlalchemy import text
import time


def print_header(text_content: str):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text_content}")
    print("=" * 60 + "\n")


def print_stats(db):
    """Print current embedding statistics"""
    stats = get_embedding_statistics(db)
    
    print("\n📊 Current Embedding Coverage:")
    print("-" * 60)
    for table_name, table_stats in stats.items():
        total = table_stats['totalRows']
        embedded = table_stats['embeddedRows']
        percentage = table_stats['embeddingPercentage']
        
        bar_length = 40
        filled = int((percentage / 100) * bar_length)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"\n{table_name}:")
        print(f"  Total: {total} | Embedded: {embedded} ({percentage:.1f}%)")
        print(f"  [{bar}]")
    print("-" * 60)


def backfill_all_messages(db, batch_size=100):
    """Backfill embeddings for all messages"""
    print_header("Backfilling Message Embeddings")
    
    # Get total count of messages without embeddings
    result = db.execute(text(
        'SELECT COUNT(*) as count FROM messages WHERE "contentEmbedding" IS NULL'
    )).fetchone()
    total_missing = result.count if result else 0
    
    print(f"Found {total_missing} messages without embeddings")
    
    if total_missing == 0:
        print("✅ All messages already have embeddings!")
        return 0
    
    print(f"Processing in batches of {batch_size}...\n")
    
    total_updated = 0
    batch_num = 1
    
    while True:
        print(f"Processing batch {batch_num}...", end=" ", flush=True)
        
        start_time = time.time()
        updated = backfill_message_embeddings(db, batch_size=batch_size)
        elapsed = time.time() - start_time
        
        if updated == 0:
            print("✅ Done!")
            break
        
        total_updated += updated
        remaining = total_missing - total_updated
        
        print(f"✓ {updated} messages ({elapsed:.1f}s) | Remaining: ~{remaining}")
        
        batch_num += 1
        time.sleep(0.5)  # Small delay to avoid rate limiting
    
    print(f"\n🎉 Successfully processed {total_updated} messages!")
    return total_updated


def backfill_all_patient_memories(db, batch_size=100):
    """Backfill embeddings for all patient memories"""
    print_header("Backfilling Patient Memory Embeddings")
    
    # Get total count of memories without embeddings
    result = db.execute(text(
        'SELECT COUNT(*) as count FROM "patientMemory" WHERE "contentEmbedding" IS NULL'
    )).fetchone()
    total_missing = result.count if result else 0
    
    print(f"Found {total_missing} patient memories without embeddings")
    
    if total_missing == 0:
        print("✅ All patient memories already have embeddings!")
        return 0
    
    print(f"Processing in batches of {batch_size}...\n")
    
    total_updated = 0
    batch_num = 1
    
    while True:
        print(f"Processing batch {batch_num}...", end=" ", flush=True)
        
        start_time = time.time()
        updated = backfill_patient_memory_embeddings(db, batch_size=batch_size)
        elapsed = time.time() - start_time
        
        if updated == 0:
            print("✅ Done!")
            break
        
        total_updated += updated
        remaining = total_missing - total_updated
        
        print(f"✓ {updated} memories ({elapsed:.1f}s) | Remaining: ~{remaining}")
        
        batch_num += 1
        time.sleep(0.5)  # Small delay to avoid rate limiting
    
    print(f"\n🎉 Successfully processed {total_updated} patient memories!")
    return total_updated


def main():
    """Main backfill execution"""
    print_header("Vector Embedding Backfill Tool")
    print("This script will generate embeddings for existing data")
    print("Using Perplexity API (OpenAI-compatible)")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Show initial statistics
        print_stats(db)
        
        # Ask user confirmation
        print("\n⚠️  WARNING: This will consume Perplexity API credits!")
        print("Approximate cost: $0.02 per 1M tokens (~1000 items)")
        
        response = input("\nContinue with backfill? (yes/no): ").strip().lower()
        
        if response not in ['yes', 'y']:
            print("\n❌ Backfill cancelled by user")
            return
        
        # Backfill messages
        messages_updated = backfill_all_messages(db)
        
        # Backfill patient memories
        memories_updated = backfill_all_patient_memories(db)
        
        # Show final statistics
        print_stats(db)
        
        # Summary
        print_header("Backfill Complete!")
        print(f"✅ Messages updated: {messages_updated}")
        print(f"✅ Patient memories updated: {memories_updated}")
        print(f"✅ Total embeddings generated: {messages_updated + memories_updated}")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Backfill interrupted by user")
        print("Progress has been saved. You can run this script again to continue.")
    
    except Exception as e:
        print(f"\n\n❌ Error during backfill: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()


if __name__ == "__main__":
    main()
