import { useAuth } from "@/components/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Calendar, Trophy, Edit, Save, X, ArrowLeft, Target, TrendingUp, Award, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest, refreshUserStatistics } from "@/lib/queryClient";
import { profileSetupSchema } from "@shared/schema";
import { useParams, useLocation } from "wouter";
import type { User as UserType, Match, CareerStats as BaseCareerStats } from "@shared/schema";

// Extended type to include timesOut field for batting average calculation
type CareerStats = BaseCareerStats & {
  timesOut?: number;
};

export default function Profile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user: currentUser, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Determine if we're viewing another player's profile or our own
  const isOwnProfile = !id;
  
  // Query for the profile user if viewing another player
  const { data: profileUser, isLoading: isProfileLoading } = useQuery<UserType>({
    queryKey: ["/api/users", id],
    enabled: !!id,
  });

  // Use current user if own profile, otherwise use queried profile user
  const user = isOwnProfile ? currentUser : profileUser;
  const isLoading = isOwnProfile ? false : isProfileLoading;
  
  // Query for player statistics
  const { data: playerStats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery<CareerStats>({
    queryKey: isOwnProfile ? ["/api/stats"] : ["/api/users", id, "stats"],
    enabled: !!user,
  });

  // Query for player matches for performance analysis
  const { data: playerMatches, isLoading: isMatchesLoading, refetch: refetchMatches } = useQuery<Match[]>({
    queryKey: isOwnProfile ? ["/api/matches"] : ["/api/users", id, "matches"],
    enabled: !!user,
  });

  // Refresh statistics data when user changes or component mounts
  useEffect(() => {
    if (user && isOwnProfile) {
      // Only refresh for own profile to ensure fresh database data
      refetchStats();
      refetchMatches();
    }
  }, [user, isOwnProfile, refetchStats, refetchMatches]);

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

  // Initialize form with empty defaults, will be synced in useEffect
  const form = useForm({
    resolver: zodResolver(profileSetupSchema.omit({ username: true }).partial()),
    defaultValues: {
      profileName: "",
      description: "",
      role: undefined as any,
      battingHand: undefined as any,
      bowlingStyle: undefined as any,
    },
  });

  // Sync form with user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        profileName: user.profileName || "",
        description: user.description || "",
        role: user.role || undefined,
        battingHand: user.battingHand || undefined,
        bowlingStyle: user.bowlingStyle || undefined,
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/profile`, data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (!isOwnProfile) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", id] });
      }
      
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
    try {
      if (user) {
        form.reset({
          profileName: user.profileName || "",
          description: user.description || "",
          role: user.role || undefined,
          battingHand: user.battingHand || undefined,
          bowlingStyle: user.bowlingStyle || undefined,
        });
      }
      setIsEditing(false);
    } catch (error) {
      setIsEditing(false);
    }
  };

  // Calculate performance metrics
  const calculatePerformanceMetrics = () => {
    if (!playerStats || !playerMatches) return null;

    const recentMatches = playerMatches.slice(-10); // Last 10 matches
    const totalMatches = playerMatches.length;

    const battingAverage = playerStats.totalRuns && playerStats.timesOut && playerStats.timesOut > 0
      ? (playerStats.totalRuns / playerStats.timesOut).toFixed(2)
      : playerStats.totalRuns > 0 ? 'Not Out' : '0.00';

    const strikeRate = playerStats.totalRuns && playerStats.ballsFaced
      ? ((playerStats.totalRuns / playerStats.ballsFaced) * 100).toFixed(2)
      : '0.00';

    const bowlingAverage = playerStats.wicketsTaken && playerStats.runsConceded
      ? (playerStats.runsConceded / playerStats.wicketsTaken).toFixed(2)
      : '0.00';

    // Convert cricket overs to decimal for proper economy calculation
    const convertOversToDecimal = (cricketOvers: number): number => {
      const wholeOvers = Math.floor(cricketOvers);
      const balls = Math.round((cricketOvers - wholeOvers) * 10);
      return wholeOvers + (balls / 6);
    };
    const decimalOvers = playerStats.oversBowled ? convertOversToDecimal(playerStats.oversBowled) : 0;
    const economyRate = playerStats.runsConceded && decimalOvers > 0
      ? (playerStats.runsConceded / decimalOvers).toFixed(2)
      : '0.00';

    return {
      battingAverage,
      strikeRate,
      bowlingAverage,
      economyRate,
      totalMatches,
      recentMatches: recentMatches.length
    };
  };

  const performanceMetrics = calculatePerformanceMetrics();

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          {!isOwnProfile && (
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          )}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {isOwnProfile ? "Your Profile" : `${user.profileName || user.username}'s Profile`}
            </h1>
            <p className="text-muted-foreground">
              {isOwnProfile ? "Your cricket profile and playing details" : "Player cricket profile and playing details"}
            </p>
          </div>

          {/* Profile Card */}
          <Card>
            <CardHeader className="text-center relative pt-16">
              {isOwnProfile && (
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
              )}
              <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">{user.profileName || "Player"}</CardTitle>
              <CardDescription className="text-lg">@{user.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isEditing || !isOwnProfile ? (
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

          {/* Statistics Section */}
          {playerStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Career Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Batting Stats */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Batting</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Runs</span>
                        <span className="font-medium">{playerStats.totalRuns || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Balls Faced</span>
                        <span className="font-medium">{playerStats.ballsFaced || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Strike Rate</span>
                        <span className="font-medium">{playerStats.strikeRate ? playerStats.strikeRate.toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Matches</span>
                        <span className="font-medium">{playerStats.matchesPlayed || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bowling Stats */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Bowling</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Wickets</span>
                        <span className="font-medium">{playerStats.wicketsTaken || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Runs Given</span>
                        <span className="font-medium">{playerStats.runsConceded || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Overs</span>
                        <span className="font-medium">{playerStats.oversBowled || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Economy</span>
                        <span className="font-medium">{playerStats.economy ? playerStats.economy.toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fielding Stats */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Fielding</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Catches</span>
                        <span className="font-medium">{playerStats.catchesTaken || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Matches</span>
                        <span className="font-medium">{playerStats.matchesPlayed || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Match Summary */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Matches</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Matches</span>
                        <span className="font-medium">{performanceMetrics?.totalMatches || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Recent Matches</span>
                        <span className="font-medium">{performanceMetrics?.recentMatches || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Analysis Section */}
          {performanceMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Performance Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Batting Performance */}
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Batting Average</h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{performanceMetrics.battingAverage}</p>
                    <p className="text-sm text-muted-foreground mt-1">Runs per innings</p>
                  </div>

                  {/* Strike Rate */}
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Strike Rate</h3>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{performanceMetrics.strikeRate}</p>
                    <p className="text-sm text-muted-foreground mt-1">(Runs scored / Balls faced) × 100</p>
                  </div>

                  {/* Bowling Average */}
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Bowling Average</h3>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{performanceMetrics.bowlingAverage}</p>
                    <p className="text-sm text-muted-foreground mt-1">Runs per wicket</p>
                  </div>

                  {/* Economy Rate */}
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Economy Rate</h3>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{performanceMetrics.economyRate}</p>
                    <p className="text-sm text-muted-foreground mt-1">Runs per over</p>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Loading State for Statistics */}
          {(isStatsLoading || isMatchesLoading) && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading player statistics...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}