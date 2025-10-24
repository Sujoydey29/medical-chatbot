import { useState } from "react";
import { ExternalLink, User, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Citation {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  searchResults?: Citation[];
  isLoading?: boolean;
  userProfileImage?: string;
}

export function ChatMessage({
  role,
  content,
  citations = [],
  searchResults = [],
  isLoading,
  userProfileImage,
}: ChatMessageProps) {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  // Parse markdown formatting (bold **text**)
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add bold text
      parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 animate-fade-in">
        <div className="flex-1">
          <div className="message-assistant">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContentWithCitations = () => {
    if (!searchResults || searchResults.length === 0 || role === "user") {
      return <div className="whitespace-pre-wrap leading-relaxed">{parseMarkdown(content)}</div>;
    }

    // Create citation mapping
    const citationMap = new Map<string, { index: number; citation: Citation }>();
    searchResults.forEach((result, index) => {
      citationMap.set(result.url, { index: index + 1, citation: result });
    });

    // Replace [1], [2], [3] style citations with inline superscripts
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Match citation patterns like [1], [2], [3], etc.
    const citationRegex = /\[(\d+)\]/g;
    let match;
    
    while ((match = citationRegex.exec(content)) !== null) {
      // Add text before citation (with markdown parsing)
      if (match.index > lastIndex) {
        const textSegment = content.substring(lastIndex, match.index);
        parts.push(
          <span key={`text-${lastIndex}`}>
            {parseMarkdown(textSegment)}
          </span>
        );
      }
      
      // Add citation as superscript
      const citationNum = parseInt(match[1]);
      if (citationNum > 0 && citationNum <= searchResults.length) {
        const result = searchResults[citationNum - 1];
        parts.push(
          <sup
            key={`citation-${match.index}`}
            className="inline-flex items-center ml-0.5 cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            onClick={() => setSelectedCitation(result)}
            title={result.title}
          >
            [{citationNum}]
          </sup>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text (with markdown parsing)
    if (lastIndex < content.length) {
      const textSegment = content.substring(lastIndex);
      parts.push(
        <span key={`text-${lastIndex}`}>
          {parseMarkdown(textSegment)}
        </span>
      );
    }

    return (
      <div className="space-y-4">
        {/* Main content with inline citations */}
        <div className="whitespace-pre-wrap leading-relaxed text-base">
          {parts.length > 0 ? parts : content}
        </div>
        
        {/* Sources section at bottom */}
        {searchResults.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="flex items-center justify-between w-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <span>Sources ({searchResults.length})</span>
              {sourcesExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {/* Compact view - single line */}
            {!sourcesExpanded && (
              <div className="flex flex-wrap gap-2">
                {searchResults.map((result, index) => {
                  let hostname = 'Unknown source';
                  try {
                    if (result.url) {
                      hostname = new URL(result.url).hostname.replace('www.', '');
                    }
                  } catch (error) {
                    hostname = result.url || 'Unknown source';
                  }
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedCitation(result)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted/50 hover:bg-muted transition-colors text-xs"
                      title={result.title}
                    >
                      <span className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-[10px] font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="truncate max-w-[150px]">
                        {hostname}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Expanded view - full cards */}
            {sourcesExpanded && (
              <div className="space-y-3">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                    onClick={() => setSelectedCitation(result)}
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {result.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.snippet}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(() => {
                            try {
                              return result.url ? new URL(result.url).hostname.replace('www.', '') : 'Unknown source';
                            } catch {
                              return result.url || 'Unknown source';
                            }
                          })()}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`flex gap-3 animate-fade-in ${role === "user" ? "justify-end" : ""}`}>
        {/* Assistant Avatar - Amazing Medical Bot Icon */}
        {role === "assistant" && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center border-2 border-white shadow-lg relative overflow-hidden group">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
            
            {/* Medical cross icon with glow effect */}
            <div className="relative z-10">
              <svg className="w-5 h-5 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
                <circle cx="12" cy="12" r="9" strokeWidth={2} opacity={0.3} />
              </svg>
            </div>
            
            {/* Pulse animation ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white opacity-20 animate-ping" />
          </div>
        )}

        <div className="flex-1 max-w-[90%]">
          <div className={`${
            role === "user" 
              ? "message-user shadow-sm" 
              : "message-assistant shadow-md border border-border/50"
          }`}>
            {renderContentWithCitations()}
          </div>
        </div>

        {/* User Avatar */}
        {role === "user" && (
          <div className="flex-shrink-0">
            {userProfileImage ? (
              <img
                src={userProfileImage}
                alt="User"
                className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Citation Dialog */}
      <Dialog open={!!selectedCitation} onOpenChange={() => setSelectedCitation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              {selectedCitation?.title}
            </DialogTitle>
            <DialogDescription className="text-left">
              {selectedCitation?.snippet}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCitation?.date && (
              <p className="text-sm text-muted-foreground">
                Published: {new Date(selectedCitation.date).toLocaleDateString()}
              </p>
            )}
            <Button
              onClick={() => window.open(selectedCitation?.url, "_blank")}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Source
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

