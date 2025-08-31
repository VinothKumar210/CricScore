import { useAuth } from "@/components/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Calendar, Trophy, Edit, Save, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { profileSetupSchema } from "@shared/schema";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatRole = (role: string) => {
    switch (role) {
      case "BATSMAN":
        return "Batsman";
      case "BOWLER":
        return "Bowler";
      case "ALL_ROUNDER":
        return "All-rounder";
      default:
        return role;
    }
  };

  const formatBattingHand = (hand: string) => {
    return hand === "RIGHT" ? "Right Hand" : "Left Hand";
  };

  const formatBowlingStyle = (style: string) => {
    switch (style) {
      case "FAST":
        return "Fast";
      case "MEDIUM_FAST":
        return "Medium Fast";
      case "SPIN":
        return "Spin";
      default:
        return style;
    }
  };

  const form = useForm({
    resolver: zodResolver(profileSetupSchema.omit({ username: true })),
    defaultValues: {
      profileName: user.profileName || "",
      description: user.description || "",
      role: user.role || undefined,
      battingHand: user.battingHand || undefined,
      bowlingStyle: user.bowlingStyle || undefined,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/profile`, "PATCH", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      refreshUser();
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: any) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset({
      profileName: user.profileName || "",
      description: user.description || "",
      role: user.role || undefined,
      battingHand: user.battingHand || undefined,
      bowlingStyle: user.bowlingStyle || undefined,
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Player Profile</h1>
            <p className="text-muted-foreground">Your cricket profile and playing details</p>
          </div>

          {/* Profile Card */}
          <Card>
            <CardHeader className="text-center relative">
              <div className="absolute top-4 right-4">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-profile"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      data-testid="button-cancel-edit"
                      disabled={updateProfileMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={form.handleSubmit(handleSave)}
                      data-testid="button-save-profile"
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>
              <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">{user.profileName || "Player"}</CardTitle>
              <CardDescription className="text-lg">@{user.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isEditing ? (
                <>
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold border-b border-border pb-2">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium" data-testid="profile-email">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Username</p>
                          <p className="font-medium" data-testid="profile-username">{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Profile Name</p>
                          <p className="font-medium" data-testid="profile-name">{user.profileName || "Player"}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Member Since</p>
                          <p className="font-medium" data-testid="profile-created">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Playing Style */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold border-b border-border pb-2">Playing Style</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Player Role</p>
                        <Badge variant="secondary" className="text-sm" data-testid="profile-role">
                          {user.role ? formatRole(user.role) : "Not specified"}
                        </Badge>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Batting Hand</p>
                        <Badge variant="outline" className="text-sm" data-testid="profile-batting-hand">
                          {user.battingHand ? formatBattingHand(user.battingHand) : "Not specified"}
                        </Badge>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Bowling Style</p>
                        <Badge variant="outline" className="text-sm" data-testid="profile-bowling-style">
                          {user.bowlingStyle ? formatBowlingStyle(user.bowlingStyle) : "Not specified"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {user.description && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold border-b border-border pb-2">About</h2>
                      <p className="text-muted-foreground leading-relaxed" data-testid="profile-description">
                        {user.description}
                      </p>
                    </div>
                  )}

                  {/* Profile Status */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold border-b border-border pb-2">Account Status</h2>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Profile Completion</span>
                      <Badge 
                        variant={user.profileComplete ? "default" : "destructive"}
                        data-testid="profile-status"
                      >
                        {user.profileComplete ? "Complete" : "Incomplete"}
                      </Badge>
                    </div>
                  </div>
                </>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                    {/* Edit Form */}
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold border-b border-border pb-2">Edit Profile</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="profileName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Profile Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Player" data-testid="edit-profile-name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Player Role</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="edit-role">
                                    <SelectValue placeholder="Select your role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="BATSMAN">Batsman</SelectItem>
                                  <SelectItem value="BOWLER">Bowler</SelectItem>
                                  <SelectItem value="ALL_ROUNDER">All-rounder</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="battingHand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Batting Hand</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="edit-batting-hand">
                                    <SelectValue placeholder="Select batting hand" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="RIGHT">Right Hand</SelectItem>
                                  <SelectItem value="LEFT">Left Hand</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bowlingStyle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bowling Style (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="edit-bowling-style">
                                    <SelectValue placeholder="Select bowling style" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="FAST">Fast</SelectItem>
                                  <SelectItem value="MEDIUM_FAST">Medium Fast</SelectItem>
                                  <SelectItem value="SPIN">Spin</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell us about yourself, your cricket experience, favorite position, or anything else you'd like to share..."
                                className="resize-none"
                                rows={3}
                                data-testid="edit-description"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}