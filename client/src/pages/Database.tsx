import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import {
  Database as DatabaseIcon,
  LogOut,
  User,
  ArrowLeft,
  MessageSquare,
  FileText,
  Brain,
  Settings,
  RefreshCw,
  Code,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";
import { VectorStatistics } from "@/components/VectorStatistics";

export default function Database() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showJsonView, setShowJsonView] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch all data
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.conversations.list,
    enabled: isAuthenticated,
  });
  
  const { data: patientMemory = [], refetch: refetchMemory } = useQuery({
    queryKey: ['memory', 'patient'],
    queryFn: api.memory.list,
    enabled: isAuthenticated,
  });
  
  const { data: preferences, refetch: refetchPreferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: api.preferences.get,
    enabled: isAuthenticated,
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshAll = () => {
    refetchConversations();
    refetchMemory();
    refetchPreferences();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-bg">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <DatabaseIcon className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">Database Viewer</CardTitle>
            <CardDescription className="text-center">
              Please sign in to view your database records
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
                <h1 className="text-lg font-bold">Database Viewer</h1>
                <p className="text-xs text-muted-foreground">
                  Supabase Data Explorer
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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
      <div className="container max-w-7xl py-8">
        {/* User Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{user?.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Login Method</p>
                <Badge variant="outline">{user?.loginMethod || "N/A"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge>{user?.role || "user"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Signed In</p>
                <p className="text-sm">
                  {user?.lastSignedIn 
                    ? formatDateTime(user.lastSignedIn) 
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different data types */}
        <Tabs defaultValue="vectors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="vectors">
              <Sparkles className="w-4 h-4 mr-2" />
              Vectors
            </TabsTrigger>
            <TabsTrigger value="conversations">
              <MessageSquare className="w-4 h-4 mr-2" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="messages">
              <FileText className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="memory">
              <Brain className="w-4 h-4 mr-2" />
              Patient Memory
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Vector Embeddings Tab */}
          <TabsContent value="vectors" className="space-y-4">
            <VectorStatistics />
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Conversations Table</CardTitle>
                    <CardDescription>
                      All your chat sessions stored in Supabase
                    </CardDescription>
                  </div>
                  <Button
                    variant={showJsonView ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowJsonView(!showJsonView)}
                  >
                    <Code className="w-4 h-4 mr-2" />
                    {showJsonView ? "Card View" : "JSON View"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Badge>{conversations.length} records</Badge>
                  {showJsonView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formatJson(conversations), "conversations")}
                    >
                      {copiedId === "conversations" ? (
                        <Check className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      Copy All
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[500px]">
                  {showJsonView ? (
                    <div className="relative">
                      <pre className="text-xs bg-muted p-4 rounded overflow-x-auto font-mono">
                        {formatJson(conversations)}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversations.map((conv) => (
                        <Card key={conv.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">ID</p>
                                <p className="font-mono text-xs">{conv.id}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">User ID</p>
                                <p className="font-mono text-xs">{conv.userId || "N/A"}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-muted-foreground">Title</p>
                                <p className="font-medium">{conv.title}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Is Guest</p>
                                <Badge variant={conv.isGuest ? "secondary" : "outline"}>
                                  {conv.isGuest ? "Yes" : "No"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Created</p>
                                <p className="text-xs">
                                  {formatDateTime(conv.createdAt)}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-muted-foreground">Last Updated</p>
                                <p className="text-xs">
                                  {formatDateTime(conv.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sample Conversation JSON</CardTitle>
                    <CardDescription>
                      Example of conversation with messages as returned by the backend API
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const sampleConversation = conversations[0];
                      if (sampleConversation) {
                        const sampleJson = formatJson({
                          conversation: sampleConversation,
                          messages: [
                            {
                              id: "msg_001",
                              conversationId: sampleConversation.id,
                              role: "user",
                              content: "What are the symptoms of diabetes?",
                              citations: null,
                              searchResults: null,
                              model: null,
                              createdAt: new Date().toISOString(),
                            },
                            {
                              id: "msg_002",
                              conversationId: sampleConversation.id,
                              role: "assistant",
                              content: "Common symptoms of diabetes include frequent urination, increased thirst, extreme hunger, unexplained weight loss, fatigue, blurred vision, and slow-healing sores.",
                              citations: [
                                "https://www.mayoclinic.org/diseases-conditions/diabetes/symptoms-causes/syc-20371444",
                                "https://www.cdc.gov/diabetes/basics/symptoms.html"
                              ],
                              searchResults: [
                                {
                                  title: "Diabetes Symptoms - Mayo Clinic",
                                  url: "https://www.mayoclinic.org/diseases-conditions/diabetes/symptoms-causes/syc-20371444",
                                  snippet: "Diabetes symptoms vary depending on how much your blood sugar is elevated...",
                                  date: "2024-03-15"
                                },
                                {
                                  title: "CDC - Diabetes Symptoms",
                                  url: "https://www.cdc.gov/diabetes/basics/symptoms.html",
                                  snippet: "Symptoms include increased thirst and urination, fatigue...",
                                  date: "2024-02-20"
                                }
                              ],
                              model: "sonar-pro",
                              createdAt: new Date().toISOString(),
                            }
                          ]
                        });
                        copyToClipboard(sampleJson, "sample-conversation");
                      }
                    }}
                  >
                    {copiedId === "sample-conversation" ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy Sample JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">Backend API Format</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      This is the exact JSON structure that the backend returns when you call <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">conversations.get()</code>
                    </p>
                  </div>

                  <ScrollArea className="h-[500px]">
                    <pre className="text-xs bg-muted p-4 rounded overflow-x-auto font-mono">
                      {formatJson({
                        conversation: conversations[0] || {
                          id: "conv_xyz789",
                          userId: "user_abc123",
                          title: "Diabetes symptoms and treatment",
                          isGuest: false,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                        messages: [
                          {
                            id: "msg_001",
                            conversationId: conversations[0]?.id || "conv_xyz789",
                            role: "user",
                            content: "What are the symptoms of diabetes?",
                            citations: null,
                            searchResults: null,
                            model: null,
                            createdAt: new Date().toISOString(),
                          },
                          {
                            id: "msg_002",
                            conversationId: conversations[0]?.id || "conv_xyz789",
                            role: "assistant",
                            content: "Common symptoms of diabetes include frequent urination, increased thirst, extreme hunger, unexplained weight loss, fatigue, blurred vision, and slow-healing sores. Type 1 diabetes symptoms often appear suddenly, while type 2 develops gradually.",
                            citations: [
                              "https://www.mayoclinic.org/diseases-conditions/diabetes/symptoms-causes/syc-20371444",
                              "https://www.cdc.gov/diabetes/basics/symptoms.html",
                              "https://www.niddk.nih.gov/health-information/diabetes/overview/symptoms-causes"
                            ],
                            searchResults: [
                              {
                                title: "Diabetes - Symptoms and causes - Mayo Clinic",
                                url: "https://www.mayoclinic.org/diseases-conditions/diabetes/symptoms-causes/syc-20371444",
                                snippet: "Diabetes symptoms vary depending on how much your blood sugar is elevated. Some people, especially if they have prediabetes or type 2 diabetes, may not have symptoms.",
                                date: "2024-03-15"
                              },
                              {
                                title: "Symptoms & Causes of Diabetes | NIDDK",
                                url: "https://www.cdc.gov/diabetes/basics/symptoms.html",
                                snippet: "Symptoms of type 1 diabetes can start quickly, in a matter of weeks. Symptoms of type 2 diabetes often develop slowly.",
                                date: "2024-02-28"
                              }
                            ],
                            model: "sonar-pro",
                            createdAt: new Date().toISOString(),
                          },
                          {
                            id: "msg_003",
                            conversationId: conversations[0]?.id || "conv_xyz789",
                            role: "user",
                            content: "How can I prevent it?",
                            citations: null,
                            searchResults: null,
                            model: null,
                            createdAt: new Date().toISOString(),
                          },
                          {
                            id: "msg_004",
                            conversationId: conversations[0]?.id || "conv_xyz789",
                            role: "assistant",
                            content: "To prevent type 2 diabetes: maintain a healthy weight, exercise regularly (150 minutes/week), eat a balanced diet rich in whole grains and vegetables, limit processed foods and sugary drinks, avoid smoking, and get regular health screenings.",
                            citations: [
                              "https://www.cdc.gov/diabetes/prevention/index.html",
                              "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-type-2-diabetes"
                            ],
                            searchResults: [
                              {
                                title: "Prevent Type 2 Diabetes - CDC",
                                url: "https://www.cdc.gov/diabetes/prevention/index.html",
                                snippet: "You can prevent or delay type 2 diabetes with proven lifestyle changes...",
                                date: "2024-01-10"
                              }
                            ],
                            model: "sonar-pro",
                            createdAt: new Date().toISOString(),
                          }
                        ]
                      })}
                    </pre>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setLocation("/chat")}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Real Messages in Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patient Memory Tab */}
          <TabsContent value="memory" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Patient Memory Table</CardTitle>
                    <CardDescription>
                      Medical entities extracted from conversations
                    </CardDescription>
                  </div>
                  <Button
                    variant={showJsonView ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowJsonView(!showJsonView)}
                  >
                    <Code className="w-4 h-4 mr-2" />
                    {showJsonView ? "Card View" : "JSON View"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Badge>{patientMemory.length} records</Badge>
                  {showJsonView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formatJson(patientMemory), "memory")}
                    >
                      {copiedId === "memory" ? (
                        <Check className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      Copy All
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[500px]">
                  {showJsonView ? (
                    <div className="relative">
                      <pre className="text-xs bg-muted p-4 rounded overflow-x-auto font-mono">
                        {formatJson(patientMemory)}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {patientMemory.map((memory) => (
                        <Card key={memory.id} className="border-l-4 border-l-green-500">
                          <CardContent className="pt-4">
                            <div className="space-y-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">ID</p>
                                <p className="font-mono text-xs">{memory.id}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Entity Type</p>
                                <Badge>{memory.entityType}</Badge>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Entity Name</p>
                                <p className="font-medium">{memory.entityName}</p>
                              </div>
                              {memory.relationships && memory.relationships.length > 0 && (
                                <div>
                                  <p className="text-muted-foreground mb-1">Relationships</p>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(memory.relationships, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {memory.metadata && (
                                <div>
                                  <p className="text-muted-foreground mb-1">Metadata</p>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(memory.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div>
                                <p className="text-muted-foreground">Conversation ID</p>
                                <p className="font-mono text-xs">{memory.conversationId || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Created</p>
                                <p className="text-xs">
                                  {formatDateTime(memory.createdAt)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences Table</CardTitle>
                <CardDescription>
                  Your saved settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                {preferences ? (
                  <div className="space-y-6">
                    {/* Model and Theme */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Preferred Model</p>
                        <Badge variant="outline" className="mt-1">
                          {preferences.preferredModel || "sonar-pro"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Theme</p>
                        <Badge variant="outline" className="mt-1">
                          {preferences.theme || "light"}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* AI Personality Settings */}
                    <div>
                      <h3 className="font-semibold text-sm mb-3">AI Personality Preferences</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Age Group</p>
                          <Badge className="mt-1">
                            {preferences.ageGroup || "middle-aged"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Response Style</p>
                          <Badge className="mt-1">
                            {preferences.responseStyle || "professional"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Language Complexity</p>
                          <Badge className="mt-1">
                            {preferences.languageComplexity || "moderate"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Response Length</p>
                          <Badge className="mt-1">
                            {preferences.responseLength || "concise"}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Include Medical Terms</p>
                          <Badge variant={preferences.includeMedicalTerms ? "default" : "secondary"} className="mt-1">
                            {preferences.includeMedicalTerms !== false ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Raw JSON View */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Full Preferences Object</p>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-[200px]">
                        {JSON.stringify(preferences, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No preferences set yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Database Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Database Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Database Type</span>
                <Badge>PostgreSQL (Supabase)</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ORM</span>
                <Badge variant="outline">Drizzle ORM</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Conversations</span>
                <Badge>{conversations.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Patient Memory Entries</span>
                <Badge>{patientMemory.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
