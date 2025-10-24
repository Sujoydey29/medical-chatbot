import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, Save, User as UserIcon, Settings, Brain } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.profile.get,
  });
  
  // Fetch user preferences
  const { data: preferences, refetch: refetchPreferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: api.preferences.get,
  });

  // Mutations
  const updateProfile = useMutation({
    mutationFn: api.profile.update,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  const updatePreferences = useMutation({
    mutationFn: api.preferences.update,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
    bio: profile?.bio || "",
    dateOfBirth: profile?.dateOfBirth || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        email: profile.email || "",
        bio: profile.bio || "",
        dateOfBirth: profile.dateOfBirth || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });
    }
  }, [profile]);

  // Preferences form state
  const [preferencesForm, setPreferencesForm] = useState<{
    ageGroup: "young" | "middle-aged" | "old";
    responseStyle: "simple" | "professional" | "detailed";
    languageComplexity: "simple" | "moderate" | "technical";
    includeMedicalTerms: boolean;
    responseLength: "brief" | "concise" | "comprehensive";
  }>({
    ageGroup: (preferences?.ageGroup as any) || "middle-aged",
    responseStyle: (preferences?.responseStyle as any) || "professional",
    languageComplexity: (preferences?.languageComplexity as any) || "moderate",
    includeMedicalTerms: preferences?.includeMedicalTerms ?? true,
    responseLength: (preferences?.responseLength as any) || "concise",
  });

  // Update preferences form when data loads
  useEffect(() => {
    if (preferences) {
      setPreferencesForm({
        ageGroup: (preferences.ageGroup as any) || "middle-aged",
        responseStyle: (preferences.responseStyle as any) || "professional",
        languageComplexity: (preferences.languageComplexity as any) || "moderate",
        includeMedicalTerms: preferences.includeMedicalTerms ?? true,
        responseLength: (preferences.responseLength as any) || "concise",
      });
    }
  }, [preferences]);

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      // Convert image to base64 for now (in production, upload to storage)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        await updateProfile.mutateAsync({
          profileImage: base64Image,
        });

        await refetchProfile();
        toast.success("Profile image updated successfully");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync(profileForm);
      await refetchProfile();
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleSavePreferences = async () => {
    try {
      await updatePreferences.mutateAsync(preferencesForm);
      await refetchPreferences();
      toast.success("Preferences updated successfully");
    } catch (error) {
      console.error("Failed to update preferences:", error);
      toast.error("Failed to update preferences");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/chat")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Profile & Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your account and personalize your AI assistant
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details and profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Image */}
                  <div className="flex items-center gap-6">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative group cursor-pointer"
                      onClick={handleProfileImageClick}
                    >
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                        {profile?.profileImage ? (
                          <img
                            src={profile.profileImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-12 h-12 text-primary" />
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </motion.div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div>
                      <p className="font-medium">{user?.name || "User"}</p>
                      <p className="text-sm text-muted-foreground">
                        Click to upload new photo
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG or GIF. Max 5MB
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, name: e.target.value })
                        }
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, email: e.target.value })
                        }
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profileForm.dateOfBirth}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, dateOfBirth: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, phone: e.target.value })
                        }
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={profileForm.address}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, address: e.target.value })
                      }
                      placeholder="Your address..."
                      rows={2}
                    />
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleSaveProfile}
                      className="w-full md:w-auto"
                      disabled={updateProfile.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfile.isPending ? "Saving..." : "Save Profile"}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* AI Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>AI Bot Personality</CardTitle>
                  <CardDescription>
                    Customize how the medical AI assistant responds to you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Age Group */}
                  <div className="space-y-2">
                    <Label>Your Age Group</Label>
                    <Select
                      value={preferencesForm.ageGroup}
                      onValueChange={(value: "young" | "middle-aged" | "old") =>
                        setPreferencesForm({ ...preferencesForm, ageGroup: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="young">Young (18-35)</SelectItem>
                        <SelectItem value="middle-aged">Middle-aged (36-60)</SelectItem>
                        <SelectItem value="old">Senior (60+)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The AI will adjust its communication style based on your age group
                    </p>
                  </div>

                  <Separator />

                  {/* Response Style */}
                  <div className="space-y-2">
                    <Label>Response Style</Label>
                    <Select
                      value={preferencesForm.responseStyle}
                      onValueChange={(value: "simple" | "professional" | "detailed") =>
                        setPreferencesForm({ ...preferencesForm, responseStyle: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple & Easy to Understand</SelectItem>
                        <SelectItem value="professional">Professional & Balanced</SelectItem>
                        <SelectItem value="detailed">Detailed & Comprehensive</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How detailed should the AI responses be?
                    </p>
                  </div>

                  {/* Language Complexity */}
                  <div className="space-y-2">
                    <Label>Language Complexity</Label>
                    <Select
                      value={preferencesForm.languageComplexity}
                      onValueChange={(value: "simple" | "moderate" | "technical") =>
                        setPreferencesForm({ ...preferencesForm, languageComplexity: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple Language</SelectItem>
                        <SelectItem value="moderate">Moderate Complexity</SelectItem>
                        <SelectItem value="technical">Technical & Medical Terms</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Preferred level of medical terminology
                    </p>
                  </div>

                  {/* Response Length */}
                  <div className="space-y-2">
                    <Label>Response Length</Label>
                    <Select
                      value={preferencesForm.responseLength}
                      onValueChange={(value: "brief" | "concise" | "comprehensive") =>
                        setPreferencesForm({ ...preferencesForm, responseLength: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brief">Brief (Quick Answers)</SelectItem>
                        <SelectItem value="concise">Concise (Balanced)</SelectItem>
                        <SelectItem value="comprehensive">Comprehensive (In-depth)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Preferred length of AI responses
                    </p>
                  </div>

                  <Separator />

                  {/* Include Medical Terms Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Include Medical Terminology</Label>
                      <p className="text-xs text-muted-foreground">
                        Use formal medical terms with explanations
                      </p>
                    </div>
                    <Switch
                      checked={preferencesForm.includeMedicalTerms}
                      onCheckedChange={(checked) =>
                        setPreferencesForm({ ...preferencesForm, includeMedicalTerms: checked })
                      }
                    />
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleSavePreferences}
                      className="w-full md:w-auto"
                      disabled={updatePreferences.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-1">How AI Personalization Works</p>
                      <p className="text-xs text-muted-foreground">
                        Based on your preferences, our AI will tailor its communication style,
                        vocabulary, and response detail to match your needs. For example, younger
                        users might receive more casual explanations, while seniors get clearer,
                        step-by-step guidance. All changes are applied automatically to future
                        conversations.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
