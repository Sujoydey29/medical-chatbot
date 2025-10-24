"""
Embedding Service with Dual Mode Support
Supports both LOCAL (Sentence-Transformers) and OPENAI embedding modes
Switch modes by setting EMBEDDING_MODE environment variable
"""

import os
from typing import List, Optional, Dict, Any
import json

# Try to import both libraries
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None

from config import Config


class EmbeddingService:
    """
    Dual-mode embedding service supporting:
    - LOCAL mode: Free Sentence-Transformers (384 dimensions)
    - OPENAI mode: OpenAI API (1536 dimensions)
    
    Set mode via environment variable:
    EMBEDDING_MODE=LOCAL   -> Use all-MiniLM-L6-v2 (384d, FREE)
    EMBEDDING_MODE=OPENAI  -> Use text-embedding-3-small (1536d, requires API key)
    """
    
    # Mode configuration
    MODES = {
        'LOCAL': {
            'model': 'all-MiniLM-L6-v2',
            'dimensions': 384,
            'max_tokens': 512,
            'requires_api_key': False
        },
        'OPENAI': {
            'model': 'text-embedding-3-small',
            'dimensions': 1536,
            'max_tokens': 8191,
            'requires_api_key': True
        }
    }
    
    def __init__(self, mode: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize embedding service
        
        Args:
            mode: 'LOCAL' or 'OPENAI' (defaults to EMBEDDING_MODE env var or 'LOCAL')
            api_key: OpenAI API key (only needed for OPENAI mode)
        """
        # Determine mode
        self.mode = mode or os.getenv('EMBEDDING_MODE', 'LOCAL').upper()
        
        if self.mode not in self.MODES:
            raise ValueError(f"Invalid mode '{self.mode}'. Must be 'LOCAL' or 'OPENAI'")
        
        # Get mode configuration
        mode_config = self.MODES[self.mode]
        self.model_name = mode_config['model']
        self.dimensions = mode_config['dimensions']
        self.max_tokens = mode_config['max_tokens']
        
        # Initialize based on mode
        if self.mode == 'LOCAL':
            self._init_local()
        elif self.mode == 'OPENAI':
            self._init_openai(api_key)
        
        print(f"✓ Embedding Service initialized!")
        print(f"  Mode: {self.mode}")
        print(f"  Model: {self.model_name}")
        print(f"  Dimensions: {self.dimensions}")
    
    def _init_local(self):
        """Initialize local Sentence-Transformers model"""
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ImportError(
                "sentence-transformers not installed! "
                "Install with: pip install sentence-transformers"
            )
        
        if SentenceTransformer is None:
            raise ImportError("SentenceTransformer is not available")
        
        try:
            print(f"Loading local model: {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)
            self.client = None
        except Exception as e:
            raise RuntimeError(f"Failed to load local model: {str(e)}")
    
    def _init_openai(self, api_key: Optional[str] = None):
        """Initialize OpenAI API client"""
        if not OPENAI_AVAILABLE:
            raise ImportError(
                "openai package not installed! "
                "Install with: pip install openai"
            )
        
        if OpenAI is None:
            raise ImportError("OpenAI is not available")
        
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        
        if not self.api_key:
            raise ValueError(
                "OPENAI_API_KEY is required for OPENAI mode. "
                "Set OPENAI_API_KEY environment variable or pass api_key parameter."
            )
        
        try:
            self.client = OpenAI(api_key=self.api_key)
            self.model = None
        except Exception as e:
            raise RuntimeError(f"Failed to initialize OpenAI client: {str(e)}")
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding vector for a single text string
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats (384 or 1536 dimensions depending on mode)
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        try:
            if self.mode == 'LOCAL':
                return self._generate_local(text)
            elif self.mode == 'OPENAI':
                return self._generate_openai(text)
        except Exception as e:
            print(f"Error generating embedding: {str(e)}")
            return None
    
    def _generate_local(self, text: str) -> List[float]:
        """Generate embedding using local Sentence-Transformers"""
        if self.model is None:
            raise RuntimeError("Model not initialized")
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    
    def _generate_openai(self, text: str) -> List[float]:
        """Generate embedding using OpenAI API"""
        if self.client is None:
            raise RuntimeError("OpenAI client not initialized")
        
        # Truncate if too long
        truncated_text = text[:self.max_tokens * 4]
        
        response = self.client.embeddings.create(
            model=self.model_name,
            input=truncated_text
        )
        
        return response.data[0].embedding
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts in a batch
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors, same order as input texts
        """
        if not texts:
            raise ValueError("Texts list cannot be empty")
        
        try:
            if self.mode == 'LOCAL':
                return self._generate_batch_local(texts)
            elif self.mode == 'OPENAI':
                return self._generate_batch_openai(texts)
            else:
                return [None] * len(texts)
        except Exception as e:
            print(f"Error generating batch embeddings: {str(e)}")
            return [None] * len(texts)
    
    def _generate_batch_local(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Generate batch embeddings using local model"""
        if self.model is None:
            raise RuntimeError("Model not initialized")
        valid_texts = [t.strip() if t else "" for t in texts]
        embeddings = self.model.encode(valid_texts, convert_to_numpy=True, show_progress_bar=True)
        return [emb.tolist() for emb in embeddings]
    
    def _generate_batch_openai(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Generate batch embeddings using OpenAI API"""
        if self.client is None:
            raise RuntimeError("OpenAI client not initialized")
        
        valid_texts = [
            (t.strip()[:self.max_tokens * 4] if t and t.strip() else "empty")
            for t in texts
        ]
        
        response = self.client.embeddings.create(
            model=self.model_name,
            input=valid_texts
        )
        
        return [item.embedding for item in response.data]
    
    # ========================================
    # Domain-specific embedding generators
    # ========================================
    
    def generate_patient_memory_embedding(
        self, 
        entity_name: str,
        entity_type: str,
        relationships: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[List[float]]:
        """
        Generate embedding for patient memory entry
        
        Returns embedding with dimensions based on current mode (384 or 1536)
        """
        text_parts = [f"{entity_type}: {entity_name}"]
        
        if relationships:
            rel_summaries = []
            for rel in relationships:
                rel_type = rel.get('type', '')
                related_entity = rel.get('relatedEntity', '')
                if rel_type and related_entity:
                    rel_summaries.append(f"{rel_type} {related_entity}")
            
            if rel_summaries:
                text_parts.append(f"Relationships: {', '.join(rel_summaries)}")
        
        if metadata:
            if 'description' in metadata:
                text_parts.append(f"Description: {metadata['description']}")
            if 'severity' in metadata:
                text_parts.append(f"Severity: {metadata['severity']}")
            if 'status' in metadata:
                text_parts.append(f"Status: {metadata['status']}")
        
        combined_text = ". ".join(text_parts)
        return self.generate_embedding(combined_text)
    
    def generate_message_embedding(
        self,
        content: str,
        role: str = "assistant",
        citations: Optional[List[str]] = None,
        search_results: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[List[float]]:
        """
        Generate embedding for chat message
        
        Returns embedding with dimensions based on current mode (384 or 1536)
        """
        text_parts = [content]
        
        if search_results:
            snippets = []
            for result in search_results[:3]:
                if 'snippet' in result:
                    snippets.append(result['snippet'])
            
            if snippets:
                text_parts.append(f"Context: {' '.join(snippets)}")
        
        combined_text = ". ".join(text_parts)
        return self.generate_embedding(combined_text)
    
    # ========================================
    # Utility functions
    # ========================================
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        import math
        
        if len(vec1) != len(vec2):
            raise ValueError("Vectors must have same dimensions")
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    @staticmethod
    def vector_to_string(embedding: List[float]) -> str:
        """Convert embedding vector to PostgreSQL-compatible string format"""
        return "[" + ",".join(str(x) for x in embedding) + "]"
    
    @staticmethod
    def string_to_vector(embedding_str: str) -> List[float]:
        """Convert PostgreSQL vector string back to list of floats"""
        cleaned = embedding_str.strip('[]')
        return [float(x) for x in cleaned.split(',')]
    
    @property
    def EMBEDDING_DIMENSIONS(self) -> int:
        """Get current embedding dimensions"""
        return self.dimensions
    
    @property
    def EMBEDDING_MODEL(self) -> str:
        """Get current model name"""
        return self.model_name


# Singleton instance
_embedding_service_instance = None

def get_embedding_service() -> EmbeddingService:
    """Get singleton instance of EmbeddingService"""
    global _embedding_service_instance
    
    if _embedding_service_instance is None:
        _embedding_service_instance = EmbeddingService()
    
    return _embedding_service_instance


# Convenience functions
def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding for single text - convenience function"""
    return get_embedding_service().generate_embedding(text)


def generate_embeddings_batch(texts: List[str]) -> List[Optional[List[float]]]:
    """Generate embeddings for multiple texts - convenience function"""
    return get_embedding_service().generate_embeddings_batch(texts)
