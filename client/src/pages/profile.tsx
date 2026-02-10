import { useAuth } from "@/components/auth/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { MatchHistoryCard } from "@/components/match/MatchHistoryCard";
import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import { User, Edit, Save, X, ArrowLeft, Target, Zap, Trophy, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { profileSetupSchema } from "@shared/schema";
import { useParams, useLocation } from "wouter";
import type { User as UserType, Match, CareerStats as BaseCareerStats } from "@shared/schema";

// Extended type to include timesOut field for batting average calculation
type CareerStats = BaseCareerStats & {
  timesOut?: number;
  bestBowling?: string;
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
  const { data: playerMatches, refetch: refetchMatches } = useQuery<Match[]>({
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
      case "BATSMAN": return "Batsman";
      case "BOWLER": return "Bowler";
      case "ALL_ROUNDER": return "All-rounder";
      default: return role;
    }
  };

  // Initialize form with empty defaults
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
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
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
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image smaller than 5MB", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" });
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

  // Calculate stats
  const battingAverage = playerStats?.totalRuns && playerStats?.timesOut && playerStats.timesOut > 0
    ? (playerStats.totalRuns / playerStats.timesOut).toFixed(1)
    : playerStats?.totalRuns ? 'N/O' : '0.0';

  const strikeRate = playerStats?.totalRuns && playerStats?.ballsFaced
    ? ((playerStats.totalRuns / playerStats.ballsFaced) * 100).toFixed(1)
    : '0.0';

  const bowlingAverage = playerStats?.wicketsTaken && playerStats.wicketsTaken > 0
    ? (playerStats.runsConceded / playerStats.wicketsTaken).toFixed(1)
    : '-';

  const convertOversToDecimal = (cricketOvers: number): number => {
    const wholeOvers = Math.floor(cricketOvers);
    const balls = Math.round((cricketOvers - wholeOvers) * 10);
    return wholeOvers + (balls / 6);
  };

  const decimalOvers = playerStats?.oversBowled ? convertOversToDecimal(playerStats.oversBowled) : 0;
  const economyRate = playerStats?.runsConceded && decimalOvers > 0
    ? (playerStats.runsConceded / decimalOvers).toFixed(1)
    : '0.0';

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalMatchPages = matchHistory ? Math.ceil(matchHistory.totalCount / matchesPerPage) : 0;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Avatar */}
              <div
                className={`relative ${isOwnProfile && isEditing ? "cursor-pointer" : ""}`}
                onClick={handleProfilePictureClick}
              >
                <AvatarWithFallback
                  src={profilePicturePreview || (user as any)?.profilePictureUrl}
                  name={user?.profileName || user?.username}
                  size="xl"
                />
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
              />

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Player
                  </Badge>
                  {user.role && (
                    <Badge variant="secondary" className="text-xs">
                      {formatRole(user.role)}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold mb-0.5">{user.profileName || "Player"}</h1>
                <p className="text-muted-foreground">@{user.username}</p>
              </div>

              {/* Edit Button */}
              {isOwnProfile && (
                <div className="flex gap-2">
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancel} disabled={updateProfileMutation.isPending}>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={form.handleSubmit(handleSave)} disabled={updateProfileMutation.isPending}>
                        <Save className="w-4 h-4 mr-1" />
                        {updateProfileMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Edit Form */}
            {isEditing && isOwnProfile && (
              <Form {...form}>
                <form className="mt-6 pt-6 border-t space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="profileName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
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
                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
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
                            <SelectTrigger><SelectValue placeholder="Select hand" /></SelectTrigger>
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
                          <FormLabel>Bowling Style</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
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
                        <FormLabel>About</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell us about yourself..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards - Horizontal Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* BATTING Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Batting</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-blue-600">{playerStats?.totalRuns || 0}</span>
                <span className="text-sm text-muted-foreground">Total Runs</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center border-t pt-3">
                <div>
                  <div className="text-sm font-semibold">{battingAverage}</div>
                  <div className="text-xs text-muted-foreground">Avg</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">{playerStats?.highestScore || 0}{playerStats?.highestScore && '*'}</div>
                  <div className="text-xs text-muted-foreground">Best</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">{strikeRate}</div>
                  <div className="text-xs text-muted-foreground">SR</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">{playerStats?.fours || 0}/{playerStats?.sixes || 0}</div>
                  <div className="text-xs text-muted-foreground">4s/6s</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BOWLING Card */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Bowling</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-green-600">{playerStats?.wicketsTaken || 0}</span>
                <span className="text-sm text-muted-foreground">Total Wickets</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center border-t pt-3">
                <div>
                  <div className="text-sm font-semibold">{bowlingAverage}</div>
                  <div className="text-xs text-muted-foreground">Avg</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">{playerStats?.bestBowling || '-'}</div>
                  <div className="text-xs text-muted-foreground">Best</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">{economyRate}</div>
                  <div className="text-xs text-muted-foreground">Eco</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">{playerStats?.oversBowled?.toFixed(1) || 0}</div>
                  <div className="text-xs text-muted-foreground">Overs</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MATCHES Card */}
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Matches</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-purple-600">{playerStats?.matchesPlayed || 0}</span>
                <span className="text-sm text-muted-foreground">Matches</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center border-t pt-3">
                <div>
                  <div className="text-sm font-semibold">{(playerStats as any)?.matchesWon || 0}</div>
                  <div className="text-xs text-muted-foreground">Won</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">{(playerStats as any)?.matchesLost || 0}</div>
                  <div className="text-xs text-muted-foreground">Lost</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {playerStats?.matchesPlayed && playerStats.matchesPlayed > 0
                      ? `${(((playerStats as any)?.matchesWon || 0) / playerStats.matchesPlayed * 100).toFixed(0)}%`
                      : '0%'}
                  </div>
                  <div className="text-xs text-muted-foreground">Win %</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Form */}
        {playerMatches && playerMatches.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Form</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {playerMatches.slice(-5).reverse().map((match: any, index: number) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-28 p-3 rounded-lg border bg-card text-center"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {formatDate(match.matchDate || match.createdAt)}
                    </div>
                    <div className="font-semibold text-sm mb-1">
                      {match.runs || 0} vs. {match.wickets || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Runs/Wkts
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Match History</CardTitle>
          </CardHeader>
          <CardContent>
            {isMatchHistoryLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : matchHistory?.matches && matchHistory.matches.length > 0 ? (
              <>
                <div className="space-y-2">
                  {matchHistory.matches.map((item: any, index: number) => (
                    <MatchHistoryCard
                      key={index}
                      match={{
                        ...item.matchSummary,
                        userPerformance: item.userPerformance
                      }}
                      showUserPerformance={true}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalMatchPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMatchPage(p => Math.max(1, p - 1))}
                      disabled={currentMatchPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentMatchPage} of {totalMatchPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMatchPage(p => Math.min(totalMatchPages, p + 1))}
                      disabled={currentMatchPage === totalMatchPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No match history yet</p>
                <p className="text-sm">Play some matches to see your history here!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}