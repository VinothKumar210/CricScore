import { useAuth } from "@/components/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Calendar, Trophy, Edit, Save, X, ArrowLeft, Target, TrendingUp, Award, BarChart3, Camera, Upload, ChevronLeft, ChevronRight, MapPin, Clock, Activity } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [currentMatchPage, setCurrentMatchPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const matchesPerPage = 10;
  
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
    queryKey: isOwnProfile ? ["/api/stats", currentUser?.id] : ["/api/users", id, "stats"],
    enabled: !!user && (isOwnProfile ? !!currentUser?.id : !!id),
  });

  // Query for player matches for performance analysis
  const { data: playerMatches, isLoading: isMatchesLoading, refetch: refetchMatches } = useQuery<Match[]>({
    queryKey: isOwnProfile ? ["/api/matches", currentUser?.id] : ["/api/users", id, "matches"],
    enabled: !!user && (isOwnProfile ? !!currentUser?.id : !!id),
  });

  // Query for player match history with pagination
  const { data: matchHistory, isLoading: isMatchHistoryLoading } = useQuery({
    queryKey: ['/api/user-match-history', user?.id, currentMatchPage],
    enabled: !!user?.id,
    queryFn: async () => {
      const userId = isOwnProfile ? currentUser?.id : id;
      if (!userId) throw new Error('User ID not found');
      const response = await apiRequest('GET', `/api/user-match-history/${userId}?page=${currentMatchPage}&limit=${matchesPerPage}`);
      return response.json();
    },
  });

  // Refresh statistics data when user changes or component mounts
  useEffect(() => {
    if (user && isOwnProfile) {
      // Only refresh for own profile to ensure fresh database data
      refetchStats();
      refetchMatches();
    }
  }, [user, isOwnProfile, refetchStats, refetchMatches]);

  // Reset pagination when viewing a different user's profile
  useEffect(() => {
    setCurrentMatchPage(1);
  }, [user?.id]);

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
      profilePictureUrl: "",
      role: "",
      battingHand: "",
      bowlingStyle: "",
    },
  });

  // Sync form with user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        profileName: user.profileName || "",
        description: user.description || "",
        profilePictureUrl: (user as any).profilePictureUrl || "",
        role: user.role || "",
        battingHand: user.battingHand || "",
        bowlingStyle: user.bowlingStyle || "",
      });
      setProfilePicturePreview((user as any).profilePictureUrl || null);
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
      setProfilePicturePreview((user as any)?.profilePictureUrl || null);
      if (user) {
        form.reset({
          profileName: user.profileName || "",
          description: user.description || "",
          profilePictureUrl: (user as any).profilePictureUrl || "",
          role: user.role || "",
          battingHand: user.battingHand || "",
          bowlingStyle: user.bowlingStyle || "",
        });
      }
      setIsEditing(false);
    } catch (error) {
      setIsEditing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setProfilePicturePreview(dataUrl);
        form.setValue('profilePictureUrl', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureClick = () => {
    if (isOwnProfile && isEditing) {
      fileInputRef.current?.click();
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

    const bowlingAverage = playerStats.wicketsTaken && playerStats.wicketsTaken > 0
      ? (playerStats.runsConceded / playerStats.wicketsTaken).toFixed(2)
      : playerStats.runsConceded > 0 ? '∞' : '0.00';

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

  // Helper functions for match history
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatOvers = (overs: number): string => {
    if (overs === 0) return '0.0';
    const wholeOvers = Math.floor(overs);
    const balls = Math.round((overs - wholeOvers) * 10);
    return balls === 0 ? `${wholeOvers}.0` : `${wholeOvers}.${balls}`;
  };

  const totalMatchPages = matchHistory ? Math.ceil(matchHistory.totalCount / matchesPerPage) : 0;

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
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              🏠 Dashboard
            </Button>
          </div>
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
              <div 
                className={`relative mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4 overflow-hidden ${
                  isOwnProfile && isEditing ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                }`}
                onClick={handleProfilePictureClick}
                data-testid="profile-picture-container"
              >
                {profilePicturePreview || (user as any)?.profilePictureUrl ? (
                  <img 
                    src={profilePicturePreview || (user as any)?.profilePictureUrl} 
                    alt="Profile picture" 
                    className="w-full h-full object-cover"
                    data-testid="img-profile-picture"
                  />
                ) : (
                  <User className="w-10 h-10 text-primary-foreground" />
                )}
                {isOwnProfile && isEditing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-profile-picture"
              />
              <CardTitle className="text-2xl">{user.profileName || "Player"}</CardTitle>
              <CardDescription className="text-lg">@{user.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isEditing || !isOwnProfile ? (
                <>
                  {/* Profile Information */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold border-b border-border pb-2">Profile Information</h2>
                    
                    {/* Basic Info - Compact Layout */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Email</span>
                        </div>
                        <span className="font-medium text-sm" data-testid="profile-email">{user.email}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Username</span>
                        </div>
                        <span className="font-medium text-sm" data-testid="profile-username">@{user.username}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <Trophy className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Profile Name</span>
                        </div>
                        <span className="font-medium text-sm" data-testid="profile-name">{user.profileName || "Player"}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Member Since</span>
                        </div>
                        <span className="font-medium text-sm" data-testid="profile-created">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Playing Style - Horizontal Layout */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-lg font-medium mb-3">Playing Style</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs" data-testid="profile-role">
                          {user.role ? formatRole(user.role) : "Role not specified"}
                        </Badge>
                        <Badge variant="outline" className="text-xs" data-testid="profile-batting-hand">
                          {user.battingHand ? formatBattingHand(user.battingHand) : "Batting not specified"}
                        </Badge>
                        {user.bowlingStyle && (
                          <Badge variant="outline" className="text-xs" data-testid="profile-bowling-style">
                            {formatBowlingStyle(user.bowlingStyle)}
                          </Badge>
                        )}
                        <Badge 
                          variant={user.profileComplete ? "default" : "destructive"}
                          className="text-xs"
                          data-testid="profile-status"
                        >
                          {user.profileComplete ? "Profile Complete" : "Profile Incomplete"}
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
                                <SelectTrigger data-testid="edit-role">
                                  <SelectValue placeholder="Select your role" />
                                </SelectTrigger>
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
                                <SelectTrigger data-testid="edit-batting-hand">
                                  <SelectValue placeholder="Select batting hand" />
                                </SelectTrigger>
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
                                <SelectTrigger data-testid="edit-bowling-style">
                                  <SelectValue placeholder="Select bowling style" />
                                </SelectTrigger>
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
                        <span className="text-sm">Highest Score</span>
                        <span className="font-medium">{playerStats.highestScore || 0}</span>
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
                        <span className="text-sm">Run Outs</span>
                        <span className="font-medium">{playerStats.runOuts || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Matches */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Matches</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Matches</span>
                        <span className="font-medium">{playerStats.matchesPlayed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">🏆 Man of the Match</span>
                        <span className="font-medium">{playerStats.manOfTheMatchAwards || 0}</span>
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
                <div className="space-y-6">
                  {/* Row 1: Batting Stats */}
                  <div className="flex gap-3 sm:gap-6">
                    {/* Batting Performance */}
                    <div className="flex-1 text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <Target className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-lg mb-1">Batting Average</h3>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{performanceMetrics.battingAverage}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Runs per innings</p>
                    </div>

                    {/* Strike Rate */}
                    <div className="flex-1 text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-lg mb-1">Strike Rate</h3>
                      <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{performanceMetrics.strikeRate}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">(Runs scored / Balls faced) × 100</p>
                    </div>
                  </div>

                  {/* Row 2: Bowling Stats */}
                  <div className="flex gap-3 sm:gap-6">
                    {/* Bowling Average */}
                    <div className="flex-1 text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <Award className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-lg mb-1">Bowling Average</h3>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{performanceMetrics.bowlingAverage}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Runs per wicket</p>
                    </div>

                    {/* Economy Rate */}
                    <div className="flex-1 text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-lg mb-1">Economy Rate</h3>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{performanceMetrics.economyRate}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Runs per over</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Match History Section */}
          {!isMatchHistoryLoading && matchHistory && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Match History</span>
                  </div>
                  {matchHistory.totalCount > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {matchHistory.totalCount} match{matchHistory.totalCount !== 1 ? 'es' : ''}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Empty State */}
                {matchHistory.totalCount === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      No matches yet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isOwnProfile ? "Your match history will appear here once you start playing cricket matches." : "This player hasn't played any matches yet."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Match Cards */}
                    <div className="space-y-4">
                  {matchHistory.matches.map((matchData: any) => {
                    const match = matchData.matchSummary;
                    const userPerformance = matchData.userPerformance;
                    
                    return (
                      <Card 
                        key={match.id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary"
                        onClick={() => setLocation(`/match-summary/${match.id}`)}
                        data-testid={`match-card-${match.id}`}
                      >
                        <CardContent className="p-4">
                          {/* Match Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="font-semibold text-lg" data-testid="text-match-teams">
                              {match.homeTeamName} vs {match.awayTeamName}
                            </div>
                            {userPerformance?.isManOfTheMatch && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                                <Trophy className="w-3 h-3 mr-1" />
                                MOM
                              </Badge>
                            )}
                          </div>

                          {/* Match Details */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(match.matchDate)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{match.venue}</span>
                            </div>
                          </div>

                          {/* Match Scores */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                              <div className="font-semibold text-sm">{match.homeTeamName}</div>
                              <div className="text-xl font-bold text-primary">
                                {match.firstInnings?.totalRuns || 0}/{match.firstInnings?.wicketsFallen || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ({formatOvers(match.firstInnings?.oversPlayed || 0)} ov)
                              </div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                              <div className="font-semibold text-sm">{match.awayTeamName}</div>
                              <div className="text-xl font-bold text-primary">
                                {match.secondInnings?.totalRuns || 0}/{match.secondInnings?.wicketsFallen || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ({formatOvers(match.secondInnings?.oversPlayed || 0)} ov)
                              </div>
                            </div>
                          </div>

                          {/* Match Result */}
                          <div className="text-center mb-4">
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                              {match.winningTeam === 'Draw' ? 'Match Drawn' : `${match.winningTeam} Won`}
                            </Badge>
                          </div>

                          {/* Player Performance Summary */}
                          {userPerformance && (
                            <div className="bg-slate-50 dark:bg-slate-800/30 border rounded-lg p-3">
                              <div className="text-sm font-medium text-muted-foreground mb-2">
                                Performance Summary
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {userPerformance.ballsFaced > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Batting:</span>
                                    <span className="ml-2 font-medium">
                                      {userPerformance.runsScored}/{userPerformance.ballsFaced} balls
                                    </span>
                                  </div>
                                )}
                                {userPerformance.oversBowled > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Bowling:</span>
                                    <span className="ml-2 font-medium">
                                      {userPerformance.wicketsTaken}w, {formatOvers(userPerformance.oversBowled)} ov
                                    </span>
                                  </div>
                                )}
                                {userPerformance.catchesTaken > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Fielding:</span>
                                    <span className="ml-2 font-medium">
                                      {userPerformance.catchesTaken} catch{userPerformance.catchesTaken !== 1 ? 'es' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalMatchPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMatchPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentMatchPage === 1}
                      data-testid="button-match-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(totalMatchPages, 5))].map((_, i) => {
                        let pageNum;
                        if (totalMatchPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentMatchPage <= 2) {
                          pageNum = i + 1;
                        } else if (currentMatchPage >= totalMatchPages - 1) {
                          pageNum = totalMatchPages - 4 + i;
                        } else {
                          pageNum = currentMatchPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentMatchPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentMatchPage(pageNum)}
                            className="w-8 h-8 p-0"
                            data-testid={`button-match-page-${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMatchPage(prev => Math.min(prev + 1, totalMatchPages))}
                      disabled={currentMatchPage === totalMatchPages}
                      data-testid="button-match-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Match History Loading State */}
          {isMatchHistoryLoading && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading match history...</p>
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