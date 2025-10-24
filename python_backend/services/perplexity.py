"""
Perplexity API Integration
Replicates server/perplexity.ts functionality
Now includes vector similarity search for efficient context retrieval
"""

from openai import OpenAI
from typing import List, Dict, Any, Optional
import json
import re
from config import Config
from services.db_operations import search_similar_patient_memories, search_similar_messages

# Initialize OpenAI client for Perplexity API with timeout
perplexity = OpenAI(
    api_key=Config.PERPLEXITY_API_KEY,
    base_url="https://api.perplexity.ai",
    timeout=60.0,  # 60 second timeout - Perplexity can be slow
    max_retries=2   # Retry twice for network issues
)


# Available Perplexity models
AVAILABLE_MODELS = [
    {
        "id": "sonar",
        "name": "Sonar",
        "description": "Fast & Cost-effective",
        "category": "search"
    },
    {
        "id": "sonar-pro",
        "name": "Sonar Pro",
        "description": "Recommended for Medical Use",
        "category": "search",
        "recommended": True
    },
    {
        "id": "sonar-reasoning",
        "name": "Sonar Reasoning",
        "description": "Advanced Analysis",
        "category": "reasoning"
    },
    {
        "id": "sonar-reasoning-pro",
        "name": "Sonar Reasoning Pro",
        "description": "Expert Level",
        "category": "reasoning"
    }
]


def is_medical_query(question: str) -> bool:
    """Detect if the question is medical or casual conversation"""
    lower_question = question.lower().strip()
    
    # Casual conversation patterns
    casual_patterns = [
        r'^(hi|hello|hey|good morning|good afternoon|good evening|greetings)',
        r'^(how are you|how\'re you|how r u|what\'s up|wassup|sup)',
        r'^(how is it going|how\'s it going|how are things)',
        r'^(my name is|i am|i\'m|this is)',
        r'^(i\'m called|they call me|people call me)',
        r'^(who are you|what are you|what is your name|your name)',
        r'^(do you know (me|my name|who i am|where i))',
        r'^(tell me about yourself|what do you do)',
        r'^(thank you|thanks|thx|ty|appreciate)',
        r'^(bye|goodbye|see you|talk later|gotta go)',
        r'^(nice to meet you|pleasure|good to)',
        r'^(sorry|my bad|excuse me|pardon)',
        r'^(ok|okay|yes|no|yeah|yep|nope|sure|alright|cool)$',
    ]
    
    # Check if casual
    for pattern in casual_patterns:
        if re.match(pattern, lower_question):
            return False
    
    # Default to medical
    return True


def build_system_prompt(user_context: Optional[Dict[str, Any]] = None, is_medical: bool = True) -> str:
    """Build personalized system prompt based on user preferences"""
    
    prefs = user_context.get('preferences', {}) if user_context else {}
    profile = user_context.get('profile', {}) if user_context else {}
    
    # Casual conversation prompt
    if not is_medical:
        casual_prompt = "You are a friendly medical AI assistant having a casual conversation. "
        
        if profile.get('name'):
            casual_prompt += f"You are chatting with {profile['name']}. "
        if profile.get('address'):
            casual_prompt += f"They are from {profile['address']}. "
        if profile.get('bio'):
            casual_prompt += f"About them: {profile['bio']}. "
        
        # Apply age group
        age_group = prefs.get('age_group', prefs.get('ageGroup'))
        if age_group == 'young':
            casual_prompt += "\n**TONE**: You're chatting with someone YOUNG (18-35). Be super casual, modern, and relatable. "
        elif age_group == 'old':
            casual_prompt += "\n**TONE**: You're chatting with a SENIOR (60+). Be very patient, respectful, and warm. "
        
        # Apply response length
        response_length = prefs.get('response_length', prefs.get('responseLength'))
        if response_length == 'brief':
            casual_prompt += "\n\n**LENGTH**: Keep responses EXTREMELY brief - MAXIMUM 1-2 SHORT sentences. "
        elif response_length == 'comprehensive':
            casual_prompt += "\n\n**LENGTH**: Provide DETAILED responses. AT LEAST 4-5 sentences. "
        
        casual_prompt += "\n\n**IMPORTANT**: This is CASUAL conversation - NOT medical consultation.\n"
        casual_prompt += "- DO NOT search the web or provide citations\n"
        casual_prompt += "- Just chat naturally and warmly"
        
        return casual_prompt
    
    # Medical prompt
    prompt = "You are a trusted medical AI assistant. "
    
    if profile.get('name'):
        prompt += f"You are assisting {profile['name']}. "
    
    # Age group personalization
    age_group = prefs.get('age_group', prefs.get('ageGroup'))
    if age_group == 'young':
        prompt += "\n\n**IMPORTANT**: User is YOUNG (18-35). Use modern, casual, relatable language. "
    elif age_group == 'middle-aged':
        prompt += "\n\n**IMPORTANT**: User is MIDDLE-AGED (36-60). Professional yet warm tone. "
    elif age_group == 'old':
        prompt += "\n\n**IMPORTANT**: User is SENIOR (60+). Be EXTRA patient. Use VERY simple language. "
    
    # Response style
    response_style = prefs.get('response_style', prefs.get('responseStyle'))
    if response_style == 'simple':
        prompt += "\n\n**CRITICAL**: Keep responses EXTREMELY simple. Use only everyday words. "
    elif response_style == 'detailed':
        prompt += "\n\n**CRITICAL**: Provide VERY detailed, comprehensive explanations. "
    
    # Language complexity
    lang_complexity = prefs.get('language_complexity', prefs.get('languageComplexity'))
    if lang_complexity == 'simple':
        prompt += "\n\n**MANDATORY**: Avoid ALL medical jargon. Use ONLY simple words. "
    elif lang_complexity == 'technical':
        prompt += "\n\n**MANDATORY**: Use proper medical terminology and technical language. "
    
    # Medical terms
    include_terms = prefs.get('include_medical_terms', prefs.get('includeMedicalTerms'))
    if include_terms is False:
        prompt += "\nAvoid formal medical terms unless necessary. "
    
    # Response length
    response_length = prefs.get('response_length', prefs.get('responseLength'))
    if response_length == 'brief':
        prompt += "\n\n**LENGTH**: EXTREMELY brief - maximum 1-2 SHORT paragraphs. "
    elif response_length == 'concise':
        prompt += "\n\n**LENGTH**: Concise - 2-3 paragraphs maximum. "
    elif response_length == 'comprehensive':
        prompt += "\n\n**LENGTH**: COMPREHENSIVE responses with full details. Multiple paragraphs. "
    else:
        prompt += "\n\n**LENGTH**: Keep responses CONCISE (2-4 paragraphs maximum). "
    
    prompt += "\n\nGuidelines:\n"
    prompt += "- Always cite reliable medical sources\n"
    prompt += "- AVOID social media, forums (Reddit, Quora)\n"
    prompt += "- Use clear, understandable language\n"
    prompt += "- Remind users to consult healthcare professionals\n"
    prompt += "- Format important points in **bold**"
    
    return prompt


def call_perplexity(
    messages: List[Dict[str, str]],
    model: str = "sonar-pro",
    user_context: Optional[Dict[str, Any]] = None,
    user_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Call Perplexity API
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        model: Perplexity model ID
        user_context: User profile and preferences
        user_message: Original user message
    
    Returns:
        Dict with 'content', 'citations', 'searchResults', 'model'
    """
    try:
        # Detect if medical query
        is_medical = is_medical_query(user_message) if user_message else True
        
        # Build system prompt
        system_prompt = build_system_prompt(user_context, is_medical)
        
        # Normalize messages (merge consecutive same-role)
        normalized = []
        for msg in messages:
            if normalized and normalized[-1]['role'] == msg['role'] and msg['role'] != 'system':
                normalized[-1]['content'] += f"\n{msg['content']}"
            else:
                normalized.append(msg.copy())
        
        # Add system prompt at beginning
        final_messages = [
            {"role": "system", "content": system_prompt}
        ]
        final_messages.extend([m for m in normalized if m['role'] != 'system'])
        
        # Ensure alternating roles
        validated_messages = [final_messages[0]]  # system message
        for i in range(1, len(final_messages)):
            current = final_messages[i]
            last = validated_messages[-1]
            
            if last['role'] == current['role']:
                last['content'] += f"\n{current['content']}"
            else:
                validated_messages.append(current)
        
        # Call Perplexity API with optimizations
        # Perplexity uses OpenAI SDK but supports additional parameters
        completion = perplexity.chat.completions.create(
            model=model,
            messages=validated_messages,  # type: ignore
            # Optimization settings
            temperature=0.3,  # Balanced temperature for quality
            max_tokens=1000,  # Reasonable limit for medical responses
            # Citations are automatically included by Perplexity in response attributes
        )
        
        content = completion.choices[0].message.content or ""
        
        # Extract citations and search results
        citations = getattr(completion, 'citations', [])
        search_results_raw = getattr(completion, 'search_results', [])
        
        search_results = []
        for result in search_results_raw:
            # Try both attribute access and dict access
            if isinstance(result, dict):
                url = result.get('url', '')
                title = result.get('title', '')
                snippet = result.get('snippet', '')
                date = result.get('date', None)
            else:
                url = getattr(result, 'url', '')
                title = getattr(result, 'title', '')
                snippet = getattr(result, 'snippet', '')
                date = getattr(result, 'date', None)
            
            # Only include results with valid URLs
            if url and url.strip() and title and title.strip():
                search_results.append({
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "date": date
                })
        
        return {
            "content": content,
            "citations": citations,
            "searchResults": search_results,
            "model": model,
            "usage": {
                "prompt_tokens": completion.usage.prompt_tokens,
                "completion_tokens": completion.usage.completion_tokens,
                "total_tokens": completion.usage.total_tokens
            } if completion.usage else None
        }
        
    except Exception as error:
        print(f"[Perplexity] API call failed: {error}")
        raise Exception("Failed to get response from Perplexity API")


def build_session_context(
    messages: List[Dict[str, str]],
    max_messages: int = 10
) -> List[Dict[str, str]]:
    """Build conversation context from recent messages"""
    recent = messages[-max_messages:] if len(messages) > max_messages else messages
    return [{"role": msg["role"], "content": msg["content"]} for msg in recent]


def build_patient_memory_prompt(patient_memory: List[Any]) -> str:
    """
    Build patient memory context prompt from memory entities
    DEPRECATED: Use build_patient_memory_prompt_from_vector() for vector search results
    """
    if not patient_memory or len(patient_memory) == 0:
        return ""
    
    memory_lines = []
    for entity in patient_memory:
        line = f"- {entity.entity_name} ({entity.entity_type})"
        
        if entity.relationships:
            relations = ", ".join([
                f"{rel['type']}: {rel['target']}"
                for rel in entity.relationships
            ])
            line += f" - {relations}"
        
        memory_lines.append(line)
    
    context = "\n".join(memory_lines)
    return f"\n\nPatient Context (from previous conversations):\n{context}\n\nUse this context when relevant."


def build_patient_memory_prompt_from_vector(search_results: List[Dict[str, Any]]) -> str:
    """
    Build patient memory context prompt from vector similarity search results
    More efficient - only includes relevant memories based on current query
    
    Args:
        search_results: List of memory dicts from vector similarity search
    
    Returns:
        Formatted context string for LLM
    """
    if not search_results or len(search_results) == 0:
        return ""
    
    memory_lines = []
    for result in search_results:
        entity_name = result.get('entityName', '')
        entity_type = result.get('entityType', '')
        similarity = result.get('similarity', 0)
        
        # Only include highly relevant memories (>70% similarity)
        if similarity < 0.7:
            continue
        
        line = f"- {entity_name} ({entity_type})"
        
        relationships = result.get('relationships')
        if relationships and isinstance(relationships, list):
            rel_parts = []
            for rel in relationships:
                if isinstance(rel, dict):
                    rel_type = rel.get('type', '')
                    related_entity = rel.get('relatedEntity', '')
                    if rel_type and related_entity:
                        rel_parts.append(f"{rel_type} {related_entity}")
            
            if rel_parts:
                line += f" | {', '.join(rel_parts)}"
        
        metadata = result.get('metadata')
        if metadata and isinstance(metadata, dict):
            if 'description' in metadata:
                line += f" - {metadata['description']}"
        
        memory_lines.append(line)
    
    if not memory_lines:
        return ""
    
    context = "\n".join(memory_lines)
    return f"\n\nRelevant Patient History (from previous conversations):\n{context}\n\nUse this context when relevant to the current question."


async def extract_patient_entities(conversation_text: str) -> List[Dict[str, Any]]:
    """Extract medical entities from conversation using AI"""
    try:
        extraction_prompt = f"""Analyze the following medical conversation and extract important entities.

Extract:
1. People (name, relationship to user)
2. Medical conditions (diagnosis, symptoms)
3. Medications (name, purpose)
4. Important medical facts

Return ONLY a JSON array:
[
  {{
    "entityType": "person|condition|medication|symptom",
    "entityName": "name of entity",
    "relationships": [{{"type": "relationship_type", "target": "related_entity"}}],
    "metadata": {{"key": "value"}}
  }}
]

Conversation:
{conversation_text}

Return only the JSON array, no other text."""

        completion = perplexity.chat.completions.create(
            model="sonar-pro",
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical entity extraction system. Extract structured medical information."
                },
                {
                    "role": "user",
                    "content": extraction_prompt
                }
            ]
        )
        
        content = completion.choices[0].message.content or "[]"
        
        # Extract JSON from response
        json_match = re.search(r'\[[\s\S]*\]', content)
        if json_match:
            entities = json.loads(json_match.group(0))
            return entities if isinstance(entities, list) else []
        
        return []
        
    except Exception as error:
        print(f"[Perplexity] Entity extraction failed: {error}")
        return []


def get_relevant_context_with_vectors(
    db_session: Any,
    user_id: str,
    user_message: str,
    match_count: int = 5,
    similarity_threshold: float = 0.7
) -> Dict[str, Any]:
    """
    Get relevant patient memory context using vector similarity search
    Significantly reduces token usage by only retrieving relevant memories
    
    Args:
        db_session: Database session
        user_id: User ID to filter memories
        user_message: User's current message/question
        match_count: Maximum number of relevant memories to retrieve
        similarity_threshold: Minimum similarity score (0-1)
    
    Returns:
        Dict with 'memoryContext' and 'tokenSavings' info
    """
    try:
        # Use vector similarity search to find relevant memories
        relevant_memories = search_similar_patient_memories(
            db=db_session,
            query_text=user_message,
            user_id=user_id,
            match_threshold=similarity_threshold,
            match_count=match_count
        )
        
        # Build context from vector search results
        memory_context = build_patient_memory_prompt_from_vector(relevant_memories)
        
        # Calculate token savings
        # Old approach: ~100 tokens per memory × all memories
        # New approach: ~100 tokens × top 5 relevant memories
        tokens_used = len(relevant_memories) * 100  # Approximate
        
        return {
            "memoryContext": memory_context,
            "relevantMemoriesCount": len(relevant_memories),
            "tokensUsed": tokens_used,
            "searchMethod": "vector_similarity"
        }
    
    except Exception as e:
        print(f"[Perplexity] Vector search failed, using fallback: {e}")
        # Fallback: return empty context if vector search fails
        return {
            "memoryContext": "",
            "relevantMemoriesCount": 0,
            "tokensUsed": 0,
            "searchMethod": "fallback_empty",
            "error": str(e)
        }
