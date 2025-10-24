import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationSidebar } from "@/components/sidebar/ConversationSidebar";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TemporaryChatToggle } from "@/components/TemporaryChatToggle";
import { ConversationSkeleton, MessageSkeleton } from "@/components/SkeletonLoaders";
import { useTemporaryChatStore } from "@/stores/temporaryChatStore";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import {
  Activity,
  LogOut,
  Menu,
  User,
  X,
  Brain,
  Database,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  searchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
    date?: string;
  }>;
}

export default function Chat() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/chat/:conversationId?");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("sonar-pro");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Temporary chat store
  const temporaryChat = useTemporaryChatStore();

  // Fetch user profile
  const { data: userProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.profile.get,
    enabled: isAuthenticated,
  });

  // Fetch available models
  const { data: modelsData = [] } = useQuery({
    queryKey: ['chat', 'models'],
    queryFn: api.chat.models,
  });
  const models = modelsData as any[];

  // Fetch user's conversations (only for authenticated users)
  const { data: conversations = [], refetch: refetchConversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.conversations.list,
    enabled: isAuthenticated,
  });

  // Fetch active conversation messages
  const { data: conversationData, refetch: refetchMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversations', activeConversationId],
    queryFn: () => api.conversations.get(activeConversationId!),
    enabled: !!activeConversationId,
  });

  // Mutations
  const createConversation = useMutation({
    mutationFn: api.conversations.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const sendMessage = useMutation({
    mutationFn: api.chat.send,
  });

  const updateTitle = useMutation({
    mutationFn: api.conversations.updateTitle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const deleteConversation = useMutation({
    mutationFn: api.conversations.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationData) {
      setMessages(
        conversationData.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          citations: msg.citations || undefined,
          searchResults: msg.searchResults || undefined,
        }))
      );
    }
  }, [conversationData]);

  // Handle temporary chat mode changes
  useEffect(() => {
    if (temporaryChat.isTemporaryMode) {
      // Clear current chat and start fresh temporary session
      setActiveConversationId(null);
      setMessages([]);
      // Navigate to base chat URL for temporary mode
      setLocation("/chat");
    } else {
      // When disabling temporary mode, just clear messages
      // The user will need to start a new conversation or select existing one
      if (activeConversationId === null && messages.length === 0) {
        // Don't auto-load conversation, keep welcome screen
      }
    }
  }, [temporaryChat.isTemporaryMode]);

  // Load conversation from URL on mount
  useEffect(() => {
    if (params?.conversationId && params.conversationId !== activeConversationId) {
      setActiveConversationId(params.conversationId);
    }
  }, [params?.conversationId]);

  // Update URL when active conversation changes
  useEffect(() => {
    if (activeConversationId && !temporaryChat.isTemporaryMode) {
      setLocation(`/chat/${activeConversationId}`, { replace: true });
    } else if (!activeConversationId && !temporaryChat.isTemporaryMode) {
      setLocation("/chat", { replace: true });
    }
  }, [activeConversationId, temporaryChat.isTemporaryMode]);

  const handleNewConversation = async () => {
    // Just clear the current conversation and messages
    // Don't create database conversation until first message is sent
    setActiveConversationId(null);
    setMessages([]);
    setLocation("/chat"); // Navigate to base chat URL
  };

  const handleSendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Handle temporary chat mode - don't create/use database conversation
      if (temporaryChat.isTemporaryMode) {
        // Call chat API without conversation ID for temporary chat
        const response = await fetch('http://localhost:5000/api/chat/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            message: content,
            model: selectedModel,
            // Don't send conversationId for temporary chats
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send temporary message');
        }

        const data = await response.json();
        
        // Add assistant message
        const assistantMessage: Message = {
          id: `temp-${Date.now()}-assistant`,
          role: "assistant",
          content: data.message.content,
          citations: data.citations,
          searchResults: data.searchResults,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Normal chat mode - create conversation if needed
        let conversationId = activeConversationId;
        if (!conversationId) {
          try {
            const newConv = await createConversation.mutateAsync({
              title: "New Conversation",
            });
            conversationId = newConv.conversation.id;
            setActiveConversationId(conversationId);
            if (isAuthenticated) {
              refetchConversations();
            }
          } catch (error) {
            console.error("Failed to create conversation:", error);
            toast.error("Failed to create conversation");
            return;
          }
        }

        const response = await sendMessage.mutateAsync({
          conversationId: conversationId!,
          message: content,
          model: selectedModel,
        });

        // Add assistant message
        const assistantMessage: Message = {
          id: response.message.id,
          role: "assistant",
          content: response.message.content,
          citations: response.citations,
          searchResults: response.searchResults,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Auto-generate conversation title from AI response (first exchange)
        // Only generate title if this is the first message in the conversation
        if (messages.length === 0) {
          // Generate intelligent short title from AI response
          const aiResponse = response.message.content;
          let titlePreview = '';
          
          // Extract key medical terms and concepts for the title
          const generateSmartTitle = (text: string, userQuestion: string): string => {
            // Remove citations like [1], [2] etc
            const cleanText = text.replace(/\[\d+\]/g, '').trim();
            
            // Common medical/health keywords to look for
            const medicalKeywords = [
              'diabetes', 'blood pressure', 'migraine', 'headache', 'symptom', 'treatment',
              'medication', 'disease', 'condition', 'infection', 'pain', 'heart', 'cancer',
              'flu', 'fever', 'diet', 'exercise', 'weight', 'eating', 'food', 'health'
            ];
            
            // Try to find main topic from the response
            const sentences = cleanText.split(/[.!?]/)
              .map(s => s.trim())
              .filter(s => s.length > 10);
            
            if (sentences.length === 0) return userQuestion.substring(0, 40);
            
            // Look for sentences containing medical keywords
            let bestSentence = sentences[0];
            for (const sentence of sentences.slice(0, 3)) {
              const lowerSentence = sentence.toLowerCase();
              if (medicalKeywords.some(keyword => lowerSentence.includes(keyword))) {
                bestSentence = sentence;
                break;
              }
            }
            
            // Extract key phrase from sentence
            // Remove common filler starts
            let title = bestSentence
              .replace(/^(eating|having|getting|when you|if you|you can|you may|you should|it can|it may|this can|this may|these can|these may)\s+/i, '')
              .replace(/^(sure|okay|yes|well|so|here|the|a|an|i can|i'll|let me|to help)\s+/i, '')
              .trim();
            
            // If starts with a verb, make it more title-like
            const words = title.split(' ');
            if (words.length > 3) {
              // Try to extract noun phrase (usually more meaningful)
              const nounPhraseMatch = title.match(/(\w+\s+){1,4}(diabetes|pressure|migraine|headache|symptom|treatment|medication|disease|condition|infection|pain|heart|cancer|flu|fever|diet|exercise|weight|food|health)/i);
              if (nounPhraseMatch) {
                title = nounPhraseMatch[0].trim();
              } else {
                // Take first 4-6 words for conciseness
                title = words.slice(0, Math.min(6, words.length)).join(' ');
              }
            }
            
            // Capitalize first letter
            title = title.charAt(0).toUpperCase() + title.slice(1);
            
            // Limit to 50 characters
            if (title.length > 50) {
              title = title.substring(0, 47) + '...';
            }
            
            // If still too generic or empty, use user question
            if (title.length < 10) {
              title = userQuestion.substring(0, 47);
              if (userQuestion.length > 47) title += '...';
            }
            
            return title;
          };
          
          titlePreview = generateSmartTitle(aiResponse, content);
          
          try {
            await updateTitle.mutateAsync({
              id: conversationId!,
              title: titlePreview,
            });
            // Refetch to update conversation list with new title
            if (isAuthenticated) {
              refetchConversations();
            }
          } catch (err) {
            console.error('Failed to update conversation title:', err);
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
      // Remove the temporary user message
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (id: string, messageId?: string) => {
    setActiveConversationId(id);
    
    // If messageId provided, scroll to it after messages load
    if (messageId) {
      // Use setTimeout to ensure messages are loaded before scrolling
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the message briefly
          messageElement.classList.add('ring-2', 'ring-primary', 'rounded-lg');
          setTimeout(() => {
            messageElement.classList.remove('ring-2', 'ring-primary', 'rounded-lg');
          }, 2000);
        }
      }, 500);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation.mutateAsync(id);
      
      // Refresh conversations list
      const updatedConversations = await refetchConversations();
      
      // If this was the active conversation
      if (id === activeConversationId) {
        // Check if there are other conversations available
        const remainingConvs = updatedConversations.data || [];
        
        if (remainingConvs.length > 0) {
          // Switch to the most recent remaining conversation
          setActiveConversationId(remainingConvs[0].id);
        } else {
          // Only create new conversation if no conversations exist
          setActiveConversationId(null);
          setMessages([]);
        }
      }
      
      toast.success("Conversation and related memories deleted");
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - only show for authenticated users */}
      <AnimatePresence mode="wait">
        {isAuthenticated && sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <ConversationSidebar
              conversations={conversations}
              activeConversationId={activeConversationId || undefined}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40"
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              )}
              <div className="flex items-center gap-2">
                {APP_LOGO && (
                  <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />
                )}
                <div>
                  <h1 className="text-lg font-bold">{APP_TITLE}</h1>
                  <p className="text-xs text-muted-foreground">
                    Trusted Medical AI Assistant
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <TemporaryChatToggle 
                isTemporary={temporaryChat.isTemporaryMode}
                onToggle={(enabled) => temporaryChat.setTemporaryMode(enabled)}
              />
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
              />
              <ThemeToggle />

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/memory")}
                    title="View Memory"
                  >
                    <Brain className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/database")}
                    title="View Database"
                  >
                    <Database className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/profile")}
                    title="Profile & Settings"
                    className="hover:bg-primary/10"
                  >
                    <div className="flex items-center gap-2 px-2">
                      {userProfile?.profileImage ? (
                        <img
                          src={userProfile.profileImage}
                          alt={user?.name || "User"}
                          className="w-8 h-8 rounded-full object-cover border-2 border-primary/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <span className="text-sm font-medium hidden sm:inline">{user?.name || "User"}</span>
                    </div>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button onClick={() => (window.location.href = getLoginUrl())}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </motion.header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto chat-scrollbar">
          <div className="container max-w-4xl py-8">
            {messagesLoading ? (
              <MessageSkeleton />
            ) : messages.length === 0 ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col items-center justify-center h-full text-center py-20"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                  className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"
                >
                  <Activity className="w-10 h-10 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">
                  Welcome to {APP_TITLE}
                </h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  Ask me any medical question and I'll provide you with reliable
                  information backed by trusted sources.
                </p>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl"
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="h-auto py-4 px-6 text-left justify-start w-full hover:shadow-lg transition-shadow"
                      onClick={() =>
                        handleSendMessage("What are the symptoms of diabetes?")
                      }
                    >
                      <div>
                        <p className="font-medium mb-1">Symptoms of Diabetes</p>
                        <p className="text-xs text-muted-foreground">
                          Learn about common diabetes symptoms
                        </p>
                      </div>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="h-auto py-4 px-6 text-left justify-start w-full hover:shadow-lg transition-shadow"
                      onClick={() =>
                        handleSendMessage("How does blood pressure medication work?")
                      }
                    >
                      <div>
                        <p className="font-medium mb-1">Blood Pressure Medication</p>
                        <p className="text-xs text-muted-foreground">
                          Understand how BP meds work
                        </p>
                      </div>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="h-auto py-4 px-6 text-left justify-start w-full hover:shadow-lg transition-shadow"
                      onClick={() =>
                        handleSendMessage("What causes migraine headaches?")
                      }
                    >
                      <div>
                        <p className="font-medium mb-1">Migraine Causes</p>
                        <p className="text-xs text-muted-foreground">
                          Discover migraine triggers
                        </p>
                      </div>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="h-auto py-4 px-6 text-left justify-start w-full hover:shadow-lg transition-shadow"
                      onClick={() =>
                        handleSendMessage("Caregiving tips for Dementia")
                      }
                    >
                      <div>
                        <p className="font-medium mb-1">Dementia Care</p>
                        <p className="text-xs text-muted-foreground">
                          Get caregiving advice
                        </p>
                      </div>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      id={`message-${message.id}`}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <ChatMessage {...message} userProfileImage={userProfile?.profileImage || undefined} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChatMessage role="assistant" content="" isLoading />
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}

