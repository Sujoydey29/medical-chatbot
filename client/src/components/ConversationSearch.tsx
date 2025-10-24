import { useState, useEffect } from "react";
import { Search, X, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  messageContent: string;
  role: "user" | "assistant";
  createdAt: string;
}

interface ConversationSearchProps {
  conversations: any[];
  onSelectConversation: (id: string, messageId?: string) => void;
}

export function ConversationSearch({ conversations, onSelectConversation }: ConversationSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [messageCache, setMessageCache] = useState<Map<string, any[]>>(new Map());

  // Pre-cache messages for faster search (only fetch once per conversation)
  useEffect(() => {
    const fetchAllMessages = async () => {
      const newCache = new Map<string, any[]>();
      
      // Fetch messages for all conversations in parallel
      await Promise.all(
        conversations.map(async (conv) => {
          // Skip if already cached
          if (messageCache.has(conv.id)) {
            newCache.set(conv.id, messageCache.get(conv.id)!);
            return;
          }
          
          try {
            const response = await fetch(`http://localhost:5000/api/conversations/${conv.id}`, {
              credentials: 'include',
            });
            if (response.ok) {
              const data = await response.json();
              newCache.set(conv.id, data.messages || []);
            }
          } catch (error) {
            console.error(`Failed to fetch messages for conversation ${conv.id}:`, error);
          }
        })
      );
      
      setMessageCache(newCache);
    };

    if (open && conversations.length > 0) {
      fetchAllMessages();
    }
  }, [open, conversations]);

  // Keyboard shortcut to open search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search through conversations and messages using cached data
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const searchMessages = () => {
      setIsSearching(true);
      const query = searchQuery.toLowerCase();
      const conversationMatches = new Map<string, SearchResult>();

      // Search through all conversations and their cached messages
      for (const conv of conversations) {
        let bestMatch: SearchResult | null = null;
        let matchPriority = 0; // 1 = title match, 2 = message match

        // Search in conversation title (highest priority)
        if (conv.title?.toLowerCase().includes(query)) {
          bestMatch = {
            conversationId: conv.id,
            conversationTitle: conv.title,
            messageId: '',
            messageContent: `Conversation: ${conv.title}`,
            role: 'user',
            createdAt: conv.createdAt,
          };
          matchPriority = 1;
        }

        // Search in cached messages
        const messages = messageCache.get(conv.id) || [];
        
        // Find first message that matches (if no title match)
        if (matchPriority < 2) {
          for (const msg of messages) {
            if (msg.content?.toLowerCase().includes(query)) {
              // Get a snippet of the matching message
              const contentLower = msg.content.toLowerCase();
              const matchIndex = contentLower.indexOf(query);
              const start = Math.max(0, matchIndex - 40);
              const end = Math.min(msg.content.length, matchIndex + query.length + 40);
              let snippet = msg.content.substring(start, end);
              if (start > 0) snippet = '...' + snippet;
              if (end < msg.content.length) snippet = snippet + '...';

              bestMatch = {
                conversationId: conv.id,
                conversationTitle: conv.title,
                messageId: msg.id,
                messageContent: snippet,
                role: msg.role,
                createdAt: msg.createdAt,
              };
              matchPriority = 2;
              break; // Only take first matching message per conversation
            }
          }
        }

        // Add best match for this conversation
        if (bestMatch) {
          conversationMatches.set(conv.id, bestMatch);
        }
      }

      // Convert map to array and sort by date (most recent first)
      const searchResults = Array.from(conversationMatches.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20); // Limit to 20 results

      setResults(searchResults);
      setIsSearching(false);
    };

    const debounceTimer = setTimeout(searchMessages, 150); // Reduced from 300ms to 150ms
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, conversations, messageCache]);

  const handleSelect = (conversationId: string, messageId?: string) => {
    onSelectConversation(conversationId, messageId);
    setOpen(false);
    setSearchQuery("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start text-muted-foreground hover:text-foreground"
      >
        <Search className="w-4 h-4 mr-2" />
        <span className="text-sm">Search chats...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="sr-only">Search Conversations</DialogTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search in conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="px-2 pb-4 max-h-[60vh] overflow-y-auto">
            {isSearching ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20 animate-spin" />
                <p className="text-sm">Searching...</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {results.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1 mt-4"
                  >
                    {results.map((result, index) => (
                      <motion.button
                        key={`${result.conversationId}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelect(result.conversationId, result.messageId)}
                        className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-4 h-4 mt-1 text-muted-foreground group-hover:text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1 group-hover:text-primary">
                              {result.conversationTitle}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {result.messageContent}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(result.createdAt)}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : searchQuery ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No messages found</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Start typing to search</p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
