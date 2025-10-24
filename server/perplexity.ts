import OpenAI from "openai";

// Initialize OpenAI client pointing to Perplexity API
const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface UserContext {
  profile?: {
    name?: string;
    bio?: string;
    dateOfBirth?: string;
    address?: string;
  };
  preferences?: {
    ageGroup?: string;
    responseStyle?: string;
    languageComplexity?: string;
    includeMedicalTerms?: boolean;
    responseLength?: string;
  };
}

export interface PerplexityResponse {
  content: string;
  citations: string[];
  searchResults: Array<{
    title: string;
    url: string;
    snippet: string;
    date?: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Detect if the question is medical or casual conversation
 */
export function isMedicalQuery(question: string): boolean {
  const lowerQuestion = question.toLowerCase().trim();
  
  // Casual conversation patterns (more comprehensive)
  const casualPatterns = [
    // Greetings
    /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)/,
    /^(how are you|how're you|how r u|what's up|wassup|sup)/,
    /^(how is it going|how's it going|how are things)/,
    
    // Introductions
    /^(my name is|i am|i'm|this is)/,
    /^(i'm called|they call me|people call me)/,
    
    // Personal questions to bot
    /^(who are you|what are you|what is your name|your name)/,
    /^(do you know (me|my name|who i am|where i))/,
    /^(tell me about yourself|what do you do)/,
    
    // Social pleasantries
    /^(thank you|thanks|thx|ty|appreciate)/,
    /^(bye|goodbye|see you|talk later|gotta go)/,
    /^(nice to meet you|pleasure|good to)/,
    /^(sorry|my bad|excuse me|pardon)/,
    
    // Very short casual responses
    /^(ok|okay|yes|no|yeah|yep|nope|sure|alright|cool)$/,
  ];

  // Check if question matches any casual pattern
  const isCasual = casualPatterns.some(pattern => pattern.test(lowerQuestion));
  
  // If casual, return false (not medical)
  if (isCasual) {
    return false;
  }
  
  // Default to medical if it contains medical keywords or is a longer question
  return true;
}

/**
 * Build personalized system prompt based on user preferences
 */
export function buildSystemPrompt(userContext?: UserContext, isMedical: boolean = true): string {
  const prefs = userContext?.preferences;
  const profile = userContext?.profile;

  // For casual conversations, use a friendly system prompt BUT STILL APPLY PREFERENCES
  if (!isMedical) {
    let casualPrompt = `You are a friendly medical AI assistant having a casual conversation. `;
    
    if (profile?.name) {
      casualPrompt += `You are chatting with ${profile.name}. `;
    }
    if (profile?.address) {
      casualPrompt += `They are from ${profile.address}. `;
    }
    if (profile?.bio) {
      casualPrompt += `About them: ${profile.bio}. `;
    }
    
    // APPLY AGE GROUP PREFERENCES even for casual chat
    if (prefs?.ageGroup) {
      switch (prefs.ageGroup) {
        case "young":
          casualPrompt += `\n**TONE**: You're chatting with someone YOUNG (18-35). Be super casual, modern, and relatable. Use contemporary language and emojis if appropriate. `;
          break;
        case "middle-aged":
          casualPrompt += `\nYou're chatting with someone MIDDLE-AGED (36-60). Be friendly but respectful. Professional yet warm. `;
          break;
        case "old":
          casualPrompt += `\n**TONE**: You're chatting with a SENIOR (60+). Be very patient, respectful, and warm. Use simple, clear language. `;
          break;
      }
    }
    
    // APPLY RESPONSE LENGTH even for casual chat
    if (prefs?.responseLength) {
      switch (prefs.responseLength) {
        case "brief":
          casualPrompt += `\n\n**STRICT LENGTH REQUIREMENT**: Keep responses EXTREMELY brief - MAXIMUM 1-2 SHORT sentences. DO NOT write more. `;
          break;
        case "concise":
          casualPrompt += `\n\n**STRICT LENGTH REQUIREMENT**: Keep responses concise - 2-3 sentences maximum. `;
          break;
        case "comprehensive":
          casualPrompt += `\n\n**STRICT LENGTH REQUIREMENT**: Provide DETAILED, COMPREHENSIVE responses. Write AT LEAST 4-5 sentences. Be thorough and elaborate even for simple questions. Include context, examples, and elaboration. `;
          break;
      }
    } else {
      casualPrompt += `\nKeep responses brief and casual. `;
    }
    
    // APPLY RESPONSE STYLE even for casual chat
    if (prefs?.responseStyle) {
      switch (prefs.responseStyle) {
        case "simple":
          casualPrompt += `\n**STYLE**: Be extremely casual and simple. Short and sweet. `;
          break;
        case "professional":
          casualPrompt += `\n**STYLE**: Be friendly but respectful. Balanced conversation. `;
          break;
        case "detailed":
          casualPrompt += `\n\n**CRITICAL STYLE REQUIREMENT**: Even for casual questions, provide DETAILED, ELABORATE responses. Don't just say "I'm good" - explain more, ask follow-up questions, show genuine interest, provide context. Be conversational but thorough. `;
          break;
      }
    }
    
    // APPLY LANGUAGE COMPLEXITY even for casual chat
    if (prefs?.languageComplexity) {
      switch (prefs.languageComplexity) {
        case "simple":
          casualPrompt += `\n**LANGUAGE**: Use VERY simple, everyday words. Like texting a friend. `;
          break;
        case "moderate":
          casualPrompt += `\n**LANGUAGE**: Use normal, conversational language. `;
          break;
        case "technical":
          casualPrompt += `\n**LANGUAGE**: You can use sophisticated vocabulary if natural. `;
          break;
      }
    }
    
    casualPrompt += `\n\n**IMPORTANT**: This is a CASUAL, FRIENDLY conversation - NOT a medical consultation.\n`;
    casualPrompt += `- DO NOT search the web or provide citations\n`;
    casualPrompt += `- Just chat naturally and warmly\n`;
    casualPrompt += `- Be conversational and friendly`;
    
    return casualPrompt;
  }

  // Build medical system prompt with personalization
  let prompt = `You are a trusted medical AI assistant. `;

  // Add user context if available
  if (profile?.name) {
    prompt += `You are assisting ${profile.name}. `;
  }

  // Age group personalization
  if (prefs?.ageGroup) {
    switch (prefs.ageGroup) {
      case "young":
        prompt += `\n\n**IMPORTANT**: Your user is YOUNG (18-35). Use modern, casual, relatable language. Avoid sounding too formal or clinical. Relate medical concepts to everyday life and use contemporary examples. Be friendly and approachable. `;
        break;
      case "middle-aged":
        prompt += `\n\n**IMPORTANT**: Your user is MIDDLE-AGED (36-60). Maintain a professional yet warm tone. Balance medical accuracy with accessibility. `;
        break;
      case "old":
        prompt += `\n\n**IMPORTANT**: Your user is a SENIOR (60+). Be EXTRA patient and respectful. Use VERY simple, clear language. Avoid ALL medical jargon. Provide step-by-step explanations. Speak slowly and clearly in your tone. `;
        break;
    }
  }

  // Response style
  if (prefs?.responseStyle) {
    switch (prefs.responseStyle) {
      case "simple":
        prompt += `\n\n**CRITICAL**: Keep responses EXTREMELY simple and easy to understand. Use only everyday, common words. Explain everything like you're talking to a friend. Avoid any complex terms. `;
        break;
      case "professional":
        prompt += `\n\nMaintain a professional medical tone with balanced, clear explanations. `;
        break;
      case "detailed":
        prompt += `\n\n**CRITICAL**: Provide VERY detailed, comprehensive, in-depth medical explanations. Include background information, mechanisms, research findings, and thorough analysis. Be comprehensive and thorough. `;
        break;
    }
  }

  // Language complexity
  if (prefs?.languageComplexity) {
    switch (prefs.languageComplexity) {
      case "simple":
        prompt += `\n\n**MANDATORY**: Avoid ALL medical jargon completely. Use ONLY simple, everyday words that anyone can understand. Never use technical terms. `;
        break;
      case "moderate":
        prompt += `\nUse some medical terminology but always provide simple explanations. `;
        break;
      case "technical":
        prompt += `\n\n**MANDATORY**: Feel free to use proper medical terminology, technical language, and scientific terms. Be as technical as needed. `;
        break;
    }
  }

  // Medical terms preference
  if (prefs?.includeMedicalTerms === false) {
    prompt += `Avoid using formal medical terms unless absolutely necessary. `;
  }

  // Response length
  if (prefs?.responseLength) {
    switch (prefs.responseLength) {
      case "brief":
        prompt += `\n\n**LENGTH REQUIREMENT**: Keep responses EXTREMELY brief - maximum 1-2 SHORT paragraphs. Be concise and to the point. `;
        break;
      case "concise":
        prompt += `\n\n**LENGTH REQUIREMENT**: Keep responses concise - 2-3 paragraphs maximum. `;
        break;
      case "comprehensive":
        prompt += `\n\n**LENGTH REQUIREMENT**: Provide COMPREHENSIVE, in-depth responses with full details. Multiple paragraphs are encouraged. Include all relevant information. `;
        break;
    }
  } else {
    prompt += `\n\n**LENGTH REQUIREMENT**: Keep responses CONCISE (2-4 paragraphs maximum). `;
  }

  prompt += `\n\nGuidelines:
- Always cite reliable medical sources (research papers, medical journals, health organizations)
- AVOID citing social media, forums (Reddit, Quora), or unreliable sources
- Use clear, understandable language
- Always remind users to consult healthcare professionals for medical advice
- If you reference previous conversation context, acknowledge it naturally
- Focus on factual, evidence-based information
- Format important points in **bold** using double asterisks

Remember: Provide accurate, helpful information while being personalized to the user's needs.`;

  return prompt;
}

/**
 * System prompt for medical chatbot
 * Ensures concise, accurate responses with trusted citations
 */
const MEDICAL_SYSTEM_PROMPT = buildSystemPrompt();

/**
 * Call Perplexity API with medical context and user personalization
 */
export async function callPerplexity(
  messages: ChatMessage[],
  model: string = "sonar-pro",
  userContext?: UserContext,
  userMessage?: string
): Promise<PerplexityResponse> {
  try {
    // Detect if this is a medical query or casual conversation
    const isMedical = userMessage ? isMedicalQuery(userMessage) : true;
    
    // Build personalized system prompt
    const systemPrompt = buildSystemPrompt(userContext, isMedical);
    
    // First, normalize the input messages to merge consecutive same-role messages
    const normalized: ChatMessage[] = [];
    for (const m of messages) {
      const last = normalized[normalized.length - 1];
      if (last && last.role === m.role && m.role !== "system") {
        // Merge consecutive non-system messages with same role
        last.content = `${last.content}\n${m.content}`;
      } else {
        normalized.push({ ...m });
      }
    }
    
    // Now add system prompt at the beginning
    const messagesWithSystem: ChatMessage[] = [
      { role: "system" as const, content: systemPrompt },
      ...normalized.filter(m => m.role !== "system") // Remove any existing system messages
    ];
    
    // Final validation: Ensure messages alternate between user and assistant (after system)
    const finalMessages: ChatMessage[] = [messagesWithSystem[0]]; // Start with system message
    
    for (let i = 1; i < messagesWithSystem.length; i++) {
      const currentMsg = messagesWithSystem[i];
      const lastMsg = finalMessages[finalMessages.length - 1];
      
      if (lastMsg.role === currentMsg.role) {
        // Same role - merge them
        lastMsg.content = `${lastMsg.content}\n${currentMsg.content}`;
      } else {
        // Different role - add it
        finalMessages.push({ ...currentMsg });
      }
    }

    // For casual conversations, we still need to use a valid model
    // Since all Perplexity models can search, we just adjust the system prompt
    // to discourage citation generation for casual chat
    
    const completion = await perplexity.chat.completions.create({
      model,
      messages: finalMessages,
    });

    const choice = completion.choices[0];
    const content = choice.message.content || "";
    
    // Extract citations and search results from response
    const citations = (completion as any).citations || [];
    const searchResults = ((completion as any).search_results || []).map((result: any) => ({
      title: result.title || "",
      url: result.url || "",
      snippet: result.snippet || "",
      date: result.date,
    }));

    return {
      content,
      citations,
      searchResults,
      model,
      usage: completion.usage as any,
    };
  } catch (error) {
    console.error("[Perplexity] API call failed:", error);
    throw new Error("Failed to get response from Perplexity API");
  }
}

/**
 * Build conversation context for session memory
 * Takes last N messages to maintain context
 */
export function buildSessionContext(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 10
): ChatMessage[] {
  const recentMessages = messages.slice(-maxMessages);
  return recentMessages.map(msg => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));
}

/**
 * Extract patient memory context and inject into system prompt
 */
export function buildPatientMemoryPrompt(
  patientMemory: Array<{
    entityType: string;
    entityName: string;
    relationships?: Array<{
      type: string;
      target: string;
    }> | null;
    metadata?: Record<string, any> | null;
  }>
): string {
  if (!patientMemory || patientMemory.length === 0) {
    return "";
  }

  const memoryContext = patientMemory.map(entity => {
    let context = `- ${entity.entityName} (${entity.entityType})`;
    
    if (entity.relationships && entity.relationships.length > 0) {
      const relations = entity.relationships
        .map(rel => `${rel.type}: ${rel.target}`)
        .join(", ");
      context += ` - ${relations}`;
    }
    
    return context;
  }).join("\n");

  return `

Patient Context (from previous conversations):
${memoryContext}

Use this context when relevant to provide personalized responses.`;
}

/**
 * Extract entities from conversation for patient memory
 * This uses LLM to intelligently extract medical entities
 */
export async function extractPatientEntities(
  conversationText: string
): Promise<Array<{
  entityType: string;
  entityName: string;
  relationships: Array<{
    type: string;
    target: string;
  }>;
  metadata: Record<string, any>;
}>> {
  try {
    const extractionPrompt = `Analyze the following medical conversation and extract important entities and relationships that should be remembered for future conversations.

Extract:
1. People mentioned (name, relationship to user)
2. Medical conditions (diagnosis, symptoms)
3. Medications (name, purpose)
4. Important medical facts

Return ONLY a JSON array with this structure:
[
  {
    "entityType": "person|condition|medication|symptom",
    "entityName": "name of entity",
    "relationships": [
      {"type": "relationship_type", "target": "related_entity"}
    ],
    "metadata": {"key": "value"}
  }
]

Conversation:
${conversationText}

Return only the JSON array, no other text.`;

    const completion = await perplexity.chat.completions.create({
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: "You are a medical entity extraction system. Extract structured medical information from conversations.",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
    });

    const content = completion.choices[0].message.content || "[]";
    
    // Try to parse JSON from response
    try {
      // Extract JSON array from response (might have markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const entities = JSON.parse(jsonMatch[0]);
        return Array.isArray(entities) ? entities : [];
      }
    } catch (parseError) {
      console.warn("[Perplexity] Failed to parse entity extraction:", parseError);
    }

    return [];
  } catch (error) {
    console.error("[Perplexity] Entity extraction failed:", error);
    return [];
  }
}

/**
 * Available Perplexity models for the chatbot
 */
export const AVAILABLE_MODELS = [
  {
    id: "sonar",
    name: "Sonar",
    description: "Fast & Cost-effective",
    category: "search",
  },
  {
    id: "sonar-pro",
    name: "Sonar Pro",
    description: "Recommended for Medical Use",
    category: "search",
    recommended: true,
  },
  {
    id: "sonar-reasoning",
    name: "Sonar Reasoning",
    description: "Advanced Analysis",
    category: "reasoning",
  },
  {
    id: "sonar-reasoning-pro",
    name: "Sonar Reasoning Pro",
    description: "Expert Level",
    category: "reasoning",
  },
] as const;

