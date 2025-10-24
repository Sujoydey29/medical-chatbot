import { useState } from 'react';

interface TemporaryChat {
  id: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: string[];
    searchResults?: any[];
  }>;
  createdAt: Date;
}

// Simple store without zustand
let temporaryChatState: TemporaryChat | null = null;
let isTemporaryMode = false;

export const useTemporaryChatStore = () => {
  const [, forceUpdate] = useState({});

  return {
    activeTemporaryChat: temporaryChatState,
    isTemporaryMode,

    createTemporaryChat: () => {
      temporaryChatState = {
        id: `temp_${Date.now()}`,
        messages: [],
        createdAt: new Date(),
      };
      isTemporaryMode = true;
      forceUpdate({});
    },

    addMessage: (message: any) => {
      if (!temporaryChatState) return;
      temporaryChatState = {
        ...temporaryChatState,
        messages: [...temporaryChatState.messages, message],
      };
      forceUpdate({});
    },

    clearTemporaryChat: () => {
      temporaryChatState = null;
      isTemporaryMode = false;
      forceUpdate({});
    },

    setTemporaryMode: (enabled: boolean) => {
      if (enabled) {
        temporaryChatState = {
          id: `temp_${Date.now()}`,
          messages: [],
          createdAt: new Date(),
        };
        isTemporaryMode = true;
      } else {
        temporaryChatState = null;
        isTemporaryMode = false;
      }
      forceUpdate({});
    },
  };
};
