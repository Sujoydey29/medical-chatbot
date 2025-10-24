"""
Unit tests for EmbeddingService (OpenAI version)
Run with: pytest test_embedding_service.py -v
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from embedding_service import EmbeddingService, get_embedding_service


class TestEmbeddingService:
    """Test suite for EmbeddingService"""
    
    @pytest.fixture
    def mock_openai_response(self):
        """Mock OpenAI API response"""
        mock_response = Mock()
        mock_embedding = Mock()
        mock_embedding.embedding = [0.1] * 1536  # 1536-dimensional vector
        mock_response.data = [mock_embedding]
        return mock_response
    
    @pytest.fixture
    def embedding_service(self):
        """Create EmbeddingService instance with mock API key"""
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-api-key'}):
            return EmbeddingService(api_key='test-api-key')
    
    def test_initialization_with_api_key(self):
        """Test service initializes with provided API key"""
        with patch('embedding_service.OpenAI'):
            service = EmbeddingService(api_key='test-key')
            assert service.api_key == 'test-key'
    
    def test_initialization_without_api_key_raises_error(self):
        """Test service raises error if no API key provided"""
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(ValueError, match="OpenAI API key is required"):
                EmbeddingService()
    
    @patch('embedding_service.OpenAI')
    def test_generate_embedding_success(self, mock_openai, embedding_service, mock_openai_response):
        """Test successful single embedding generation"""
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value = mock_openai_response
        embedding_service.client = mock_client
        
        result = embedding_service.generate_embedding("Test text")
        
        assert result is not None
        assert len(result) == 1536
        assert all(x == 0.1 for x in result)
        mock_client.embeddings.create.assert_called_once()
    
    def test_generate_embedding_empty_text_raises_error(self, embedding_service):
        """Test error raised for empty text"""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            embedding_service.generate_embedding("")
    
    @patch('embedding_service.OpenAI')
    def test_generate_embedding_truncates_long_text(self, mock_openai, embedding_service, mock_openai_response):
        """Test long text is truncated"""
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value = mock_openai_response
        embedding_service.client = mock_client
        
        long_text = "x" * (embedding_service.MAX_TOKENS * 5)
        result = embedding_service.generate_embedding(long_text)
        
        assert result is not None
        assert len(result) == 1536
    
    @patch('embedding_service.OpenAI')
    def test_generate_embeddings_batch_success(self, mock_openai, embedding_service):
        """Test successful batch embedding generation"""
        # Mock batch response with 3 embeddings
        mock_response = Mock()
        mock_response.data = [
            Mock(embedding=[0.1] * 1536),
            Mock(embedding=[0.2] * 1536),
            Mock(embedding=[0.3] * 1536)
        ]
        
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value = mock_response
        embedding_service.client = mock_client
        
        texts = ["Text 1", "Text 2", "Text 3"]
        results = embedding_service.generate_embeddings_batch(texts)
        
        assert len(results) == 3
        assert all(len(emb) == 1536 for emb in results if emb is not None)
    
    def test_generate_embeddings_batch_empty_list_raises_error(self, embedding_service):
        """Test error raised for empty text list"""
        with pytest.raises(ValueError, match="Texts list cannot be empty"):
            embedding_service.generate_embeddings_batch([])
    
    @patch('embedding_service.OpenAI')
    def test_generate_patient_memory_embedding(self, mock_openai, embedding_service, mock_openai_response):
        """Test patient memory embedding generation"""
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value = mock_openai_response
        embedding_service.client = mock_client
        
        result = embedding_service.generate_patient_memory_embedding(
            entity_name="Diabetes Type 2",
            entity_type="condition",
            relationships=[
                {"type": "treated_with", "relatedEntity": "Metformin"},
                {"type": "causes", "relatedEntity": "High blood sugar"}
            ],
            metadata={
                "description": "Chronic metabolic disorder",
                "severity": "moderate"
            }
        )
        
        assert result is not None
        assert len(result) == 1536
        # Verify API was called
        mock_client.embeddings.create.assert_called_once()
        # Check that the input text combines all information
        call_args = mock_client.embeddings.create.call_args
        input_text = call_args.kwargs['input']
        assert "Diabetes Type 2" in input_text
        assert "condition" in input_text
        assert "treated_with" in input_text
    
    @patch('embedding_service.OpenAI')
    def test_generate_message_embedding(self, mock_openai, embedding_service, mock_openai_response):
        """Test message embedding generation"""
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value = mock_openai_response
        embedding_service.client = mock_client
        
        result = embedding_service.generate_message_embedding(
            content="Patient reports fever and cough",
            role="user",
            search_results=[
                {"snippet": "Common cold symptoms"},
                {"snippet": "Flu indicators"}
            ]
        )
        
        assert result is not None
        assert len(result) == 1536
        mock_client.embeddings.create.assert_called_once()
    
    def test_cosine_similarity(self):
        """Test cosine similarity calculation"""
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [1.0, 0.0, 0.0]
        
        similarity = EmbeddingService.cosine_similarity(vec1, vec2)
        assert similarity == pytest.approx(1.0, rel=1e-6)
        
        vec3 = [0.0, 1.0, 0.0]
        similarity2 = EmbeddingService.cosine_similarity(vec1, vec3)
        assert similarity2 == pytest.approx(0.0, rel=1e-6)
    
    def test_cosine_similarity_different_dimensions_raises_error(self):
        """Test error for mismatched vector dimensions"""
        vec1 = [1.0, 0.0]
        vec2 = [1.0, 0.0, 0.0]
        
        with pytest.raises(ValueError, match="Vectors must have same dimensions"):
            EmbeddingService.cosine_similarity(vec1, vec2)
    
    def test_vector_to_string(self):
        """Test vector to string conversion"""
        vector = [0.1, 0.2, 0.3]
        result = EmbeddingService.vector_to_string(vector)
        assert result == "[0.1,0.2,0.3]"
    
    def test_string_to_vector(self):
        """Test string to vector conversion"""
        vector_str = "[0.1,0.2,0.3]"
        result = EmbeddingService.string_to_vector(vector_str)
        assert result == pytest.approx([0.1, 0.2, 0.3])
    
    @patch('embedding_service.EmbeddingService')
    def test_get_embedding_service_singleton(self, mock_service_class):
        """Test singleton pattern for get_embedding_service"""
        # Reset singleton
        import embedding_service
        embedding_service._embedding_service_instance = None
        
        mock_instance = Mock()
        mock_service_class.return_value = mock_instance
        
        # First call creates instance
        service1 = get_embedding_service()
        # Second call returns same instance
        service2 = get_embedding_service()
        
        assert service1 is service2


class TestEmbeddingServiceIntegration:
    """Integration tests (requires real API key)"""
    
    def test_real_embedding_generation(self, request):
        """Test with real OpenAI API (requires API key)"""
        import os
        
        # Check if integration tests should run
        if not request.config.getoption("--run-integration", default=False):
            pytest.skip("Integration tests require --run-integration flag")
        
        if 'OPENAI_API_KEY' not in os.environ:
            pytest.skip("OPENAI_API_KEY not set")
        
        service = EmbeddingService()
        result = service.generate_embedding("Hello, world!")
        
        assert result is not None
        assert len(result) == 1536
        assert all(isinstance(x, float) for x in result)


def pytest_addoption(parser):
    """Add custom pytest option for integration tests"""
    parser.addoption(
        "--run-integration",
        action="store_true",
        default=False,
        help="Run integration tests that require API keys"
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
