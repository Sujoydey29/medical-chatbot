import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import {
  Activity,
  Brain,
  Database,
  LogOut,
  Trash2,
  User,
  ArrowLeft,
  Clock,
  MessageSquare,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Memory() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch patient memory
  const { data: patientMemory = [], refetch: refetchMemory } = useQuery({
    queryKey: ['memory', 'patient'],
    queryFn: api.memory.list,
    enabled: isAuthenticated,
  });

  // Fetch recent conversations to show session memory
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.conversations.list,
    enabled: isAuthenticated,
  });

  const deleteMemory = useMutation({
    mutationFn: api.memory.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memory', 'patient'] }),
  });

  const clearAllMemory = useMutation({
    mutationFn: api.memory.clearAll,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memory', 'patient'] }),
  });

  const deleteConversation = useMutation({
    mutationFn: api.conversations.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteMemory.mutateAsync(id);
      refetchMemory();
      toast.success("Memory deleted");
      setDeleteDialogOpen(false);
      setMemoryToDelete(null);
    } catch (error) {
      console.error("Failed to delete memory:", error);
      toast.error("Failed to delete memory");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllMemory.mutateAsync();
      refetchMemory();
      toast.success("All patient memory cleared");
    } catch (error) {
      console.error("Failed to clear memory:", error);
      toast.error("Failed to clear memory");
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation.mutateAsync(id);
      refetchConversations();
      toast.success("Conversation and related memories deleted");
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-bg">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">Memory Viewer</CardTitle>
            <CardDescription className="text-center">
              Please sign in to view your conversation memory and patient history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="w-full"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="w-full"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/chat")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
            <div className="flex items-center gap-2">
              {APP_LOGO && (
                <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />
              )}
              <div>
                <h1 className="text-lg font-bold">Memory Viewer</h1>
                <p className="text-xs text-muted-foreground">
                  Session & Patient Memory
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user?.name || "User"}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-6xl py-8 space-y-8">
        {/* Session Memory Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold">Session Memory</h2>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {conversations.length} Conversations
            </Badge>
          </div>
          <p className="text-muted-foreground mb-6 text-sm">
            Your recent conversations are stored to maintain context. The system remembers the last 10 messages from each conversation for continuity.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {conversations.slice(0, 6).map((conv) => (
              <Card key={conv.id} className="hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold line-clamp-1 mb-1">
                        {conv.title}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(conv.updatedAt)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteConversation(conv.id)}
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/chat")}
                    className="w-full text-xs"
                  >
                    Open Conversation
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {conversations.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start chatting to build your session memory
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Patient Memory Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-pink-600" />
              <h2 className="text-2xl font-bold">Patient Memory (Graph)</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                {patientMemory.length} Entities
              </Badge>
              {patientMemory.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mb-6 text-sm">
            Medical entities extracted from your conversations. This graph-based memory enables personalized responses based on your health history.
          </p>

          {patientMemory.length > 0 ? (
            <div className="space-y-4">
              {patientMemory.map((memory) => (
                <Card key={memory.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            {memory.entityType}
                          </Badge>
                          <span className="font-semibold text-base">{memory.entityName}</span>
                        </div>
                        <CardDescription className="text-xs">
                          Extracted on {formatDateTime(memory.createdAt)}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMemoryToDelete(memory.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {memory.relationships && memory.relationships.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Relationships:</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {memory.relationships.map((rel: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                              {rel.type.replace(/_/g, ' ')}: {rel.target}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Additional Info:</h4>
                        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md font-mono overflow-x-auto">
                          {JSON.stringify(memory.metadata, null, 2)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No patient memory yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Have medical conversations to build your personalized memory graph
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation("/chat")}
                >
                  Start Chatting
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Info Section */}
        <section>
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5" />
                How Memory Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Session Memory</h4>
                  <p className="text-muted-foreground">
                    Maintains conversation context by storing the last 10 messages from each conversation. This allows the AI to provide relevant, contextual responses without repeating information.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Brain className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Patient Memory</h4>
                  <p className="text-muted-foreground">
                    Automatically extracts medical entities (conditions, medications, symptoms) from your conversations and stores them in a knowledge graph. This enables personalized responses based on your health history.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <span className="text-lg">🔒</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Privacy</h4>
                  <p className="text-muted-foreground">
                    All memory data is private to your account and stored securely. You can delete individual memories or clear everything at any time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this memory entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemoryToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memoryToDelete && handleDeleteMemory(memoryToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
