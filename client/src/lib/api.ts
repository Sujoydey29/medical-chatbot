/**
 * REST API Client
 * Replaces tRPC with direct REST API calls to Python Flask backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Helper function to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Important: Include cookies for session
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return handleResponse<T>(response);
}

// ============================================
// AUTH API
// ============================================

export const authApi = {
  me: async () => {
    return apiRequest<any | null>('/auth/me');
  },

  register: async (data: {
    email: string;
    password: string;
    name?: string;
  }) => {
    return apiRequest<{ user: any; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (data: { email: string; password: string }) => {
    return apiRequest<{ user: any; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  firebaseAuth: async (data: { idToken: string }) => {
    return apiRequest<{ user: any; message: string }>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  logout: async () => {
    return apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};

// ============================================
// CONVERSATIONS API
// ============================================

export const conversationsApi = {
  list: async () => {
    return apiRequest<any[]>('/conversations');
  },

  get: async (id: string) => {
    return apiRequest<any>(`/conversations/${id}`);
  },

  create: async (data: { title?: string }) => {
    return apiRequest<any>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTitle: async (data: { id: string; title: string }) => {
    return apiRequest<any>(`/conversations/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: data.title }),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/conversations/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// CHAT API
// ============================================

export const chatApi = {
  send: async (data: {
    conversationId: string;
    message: string;
    model?: string;
  }) => {
    return apiRequest<{
      message: any;
      citations?: string[];
      searchResults?: any[];
    }>('/chat/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  models: async () => {
    return apiRequest<any[]>('/chat/models');
  },
};

// ============================================
// MEMORY API
// ============================================

export const memoryApi = {
  list: async () => {
    return apiRequest<any[]>('/memory/patient');
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/memory/patient/${id}`, {
      method: 'DELETE',
    });
  },

  clearAll: async () => {
    return apiRequest<{ message: string }>('/memory/patient/clear', {
      method: 'POST',
    });
  },
};

// ============================================
// PROFILE API
// ============================================

export const profileApi = {
  get: async () => {
    return apiRequest<any>('/profile');
  },

  update: async (data: {
    name?: string;
    email?: string;
    bio?: string;
    dateOfBirth?: string;
    phone?: string;
    address?: string;
    profileImage?: string;
  }) => {
    return apiRequest<any>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// PREFERENCES API
// ============================================

export const preferencesApi = {
  get: async () => {
    return apiRequest<any>('/preferences');
  },

  update: async (data: {
    ageGroup?: string;
    responseStyle?: string;
    languageComplexity?: string;
    includeMedicalTerms?: boolean;
    responseLength?: string;
  }) => {
    return apiRequest<any>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// VECTOR SEARCH API
// ============================================

export const vectorApi = {
  searchMemories: async (data: {
    query: string;
    matchThreshold?: number;
    matchCount?: number;
  }) => {
    return apiRequest<{
      success: boolean;
      query: string;
      results: any[];
      count: number;
    }>('/vector/search/memories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  searchMessages: async (data: {
    query: string;
    conversationId?: string;
    matchThreshold?: number;
    matchCount?: number;
  }) => {
    return apiRequest<{
      success: boolean;
      query: string;
      results: any[];
      count: number;
    }>('/vector/search/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getEmbeddingStats: async () => {
    return apiRequest<{
      success: boolean;
      statistics: {
        messages?: {
          totalRows: number;
          embeddedRows: number;
          embeddingPercentage: number;
        };
        patientMemory?: {
          totalRows: number;
          embeddedRows: number;
          embeddingPercentage: number;
        };
      };
    }>('/vector/embeddings/stats');
  },

  backfillMessages: async (data?: {
    batchSize?: number;
    conversationId?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      updatedCount: number;
      message: string;
    }>('/vector/embeddings/backfill/messages', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  backfillMemories: async (data?: { batchSize?: number }) => {
    return apiRequest<{
      success: boolean;
      updatedCount: number;
      message: string;
    }>('/vector/embeddings/backfill/memories', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },
};

// ============================================
// COMBINED API OBJECT (for easier imports)
// ============================================

export const api = {
  auth: authApi,
  conversations: conversationsApi,
  chat: chatApi,
  memory: memoryApi,
  profile: profileApi,
  preferences: preferencesApi,
  vector: vectorApi,
};

export default api;
