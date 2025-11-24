import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Crown, Users, Shield, ArrowLeft, MoreVertical, UserMinus, TrendingUp, TrendingDown, UserCheck, UserPlus, Search, Trash2, Edit, BarChart3, Trophy, Target, Zap, Timer, Calendar, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Team, User } from "@shared/schema";

interface TeamMember extends User {
  isViceCaptain?: boolean;
}

interface TeamStatisticsData {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  winRatio: number;
  topRunScorer?: User;
  topRunScorerRuns: number;
  topWicketTaker?: User;
  topWicketTakerWickets: number;
  bestStrikeRatePlayer?: User;
  bestStrikeRate: number;
  bestEconomyPlayer?: User;
  bestEconomy: number;
  mostManOfTheMatchPlayer?: User;
  mostManOfTheMatchAwards: number;
}

function TeamStatistics({ teamId }: { teamId: string }) {
  const { data: stats, isLoading } = useQuery<TeamStatisticsData>({
    queryKey: ["/api/teams", teamId, "statistics"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No statistics available</p>
        <p className="text-sm">Play some team matches to see statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Match Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
          Match Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.matchesPlayed}</div>
            <div className="text-sm text-muted-foreground">Matches Played</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.matchesWon}</div>
            <div className="text-sm text-muted-foreground">Wins</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.matchesLost}</div>
            <div className="text-sm text-muted-foreground">Losses</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{(stats.winRatio * 100).toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Win Ratio</div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Target className="mr-2 h-5 w-5 text-blue-500" />
          Top Performers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Run Scorer */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Top Run Scorer</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            {stats.topRunScorer ? (
              <div>
                <div className="font-semibold">{stats.topRunScorer.profileName || stats.topRunScorer.username}</div>
                <div className="text-2xl font-bold text-green-600">{stats.topRunScorerRuns} runs</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </div>

          {/* Top Wicket Taker */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Top Wicket Taker</span>
              <Target className="h-4 w-4 text-red-500" />
            </div>
            {stats.topWicketTaker ? (
              <div>
                <div className="font-semibold">{stats.topWicketTaker.profileName || stats.topWicketTaker.username}</div>
                <div className="text-2xl font-bold text-red-600">{stats.topWicketTakerWickets} wickets</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </div>

          {/* Best Strike Rate */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Best Strike Rate (20+ runs)</span>
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
            {stats.bestStrikeRatePlayer ? (
              <div>
                <div className="font-semibold">{stats.bestStrikeRatePlayer.profileName || stats.bestStrikeRatePlayer.username}</div>
                <div className="text-2xl font-bold text-yellow-600">{stats.bestStrikeRate.toFixed(1)}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Minimum 20 runs required</div>
            )}
          </div>

          {/* Most Economical Bowler */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Best Economy (2+ overs)</span>
              <Timer className="h-4 w-4 text-purple-500" />
            </div>
            {stats.bestEconomyPlayer ? (
              <div>
                <div className="font-semibold">{stats.bestEconomyPlayer.profileName || stats.bestEconomyPlayer.username}</div>
                <div className="text-2xl font-bold text-purple-600">{stats.bestEconomy.toFixed(2)}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Minimum 2 overs required</div>
            )}
          </div>

          {/* Most Man of the Match Awards */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Most Man of the Match</span>
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            {stats.mostManOfTheMatchPlayer && stats.mostManOfTheMatchAwards > 0 ? (
              <div>
                <div className="font-semibold">{stats.mostManOfTheMatchPlayer.profileName || stats.mostManOfTheMatchPlayer.username}</div>
                <div className="text-2xl font-bold text-amber-600">{stats.mostManOfTheMatchAwards} 🏆</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No awards yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TeamMatchHistoryData {
  matches: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    matchDate: string;
    venue: string;
    firstInningsRuns: number;
    firstInningsWickets: number;
    firstInningsOvers: number;
    secondInningsRuns: number;
    secondInningsWickets: number;
    secondInningsOvers: number;
    firstInningsTeam: string;
    secondInningsTeam: string;
    winningTeam: string;
    homeTeam?: { id: string; name: string; } | null;
    awayTeam?: { id: string; name: string; } | null;
    manOfTheMatchUser?: {
      id: string;
      profileName: string;
      username: string;
    } | null;
  }[];
  totalCount: number;
}

function TeamMatchHistory({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: matchHistory, isLoading, error } = useQuery<TeamMatchHistoryData>({
    queryKey: ['/api/team-match-history', teamId, currentPage, itemsPerPage],
    queryFn: async () => {
      const token = (await import("@/lib/auth")).authService.getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const url = `/api/team-match-history/${teamId}?page=${currentPage}&limit=${itemsPerPage}`;
      const response = await fetch(url, {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return await response.json();
    },
    enabled: !!teamId,
  });

  const totalPages = matchHistory ? Math.ceil(matchHistory.totalCount / itemsPerPage) : 0;

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
    // Handle cricket overs format: 4.3 means 4 overs and 3 balls
    const wholeOvers = Math.floor(overs);
    // Extract balls from decimal part (e.g., 4.3 -> 3 balls)
    const balls = Math.round((overs * 10) % 10);
    
    // Ensure balls are in valid range 0-5 (6 balls = 1 over)
    const validBalls = Math.min(balls, 5);
    
    return validBalls === 0 ? `${wholeOvers}.0` : `${wholeOvers}.${validBalls}`;
  };

  const MatchCard = ({ match }: { match: TeamMatchHistoryData['matches'][0] }) => {
    // Determine which team the current team is (home or away) using teamId for accuracy
    const isHomeTeam = match.homeTeam?.id === teamId;
    const isAwayTeam = match.awayTeam?.id === teamId;
    
    // If neither homeTeam nor awayTeam has the teamId, fall back to name comparison
    const isCurrentTeamHome = isHomeTeam || (!isAwayTeam && match.homeTeamName === teamName);
    
    const teamScore = isCurrentTeamHome 
      ? (match.firstInningsTeam === match.homeTeamName ? match.firstInningsRuns : match.secondInningsRuns)
      : (match.firstInningsTeam === match.awayTeamName ? match.firstInningsRuns : match.secondInningsRuns);
    const teamWickets = isCurrentTeamHome 
      ? (match.firstInningsTeam === match.homeTeamName ? match.firstInningsWickets : match.secondInningsWickets)
      : (match.firstInningsTeam === match.awayTeamName ? match.firstInningsWickets : match.secondInningsWickets);
    const teamOvers = isCurrentTeamHome 
      ? (match.firstInningsTeam === match.homeTeamName ? match.firstInningsOvers : match.secondInningsOvers)
      : (match.firstInningsTeam === match.awayTeamName ? match.firstInningsOvers : match.secondInningsOvers);
    
    const opponentScore = isCurrentTeamHome 
      ? (match.firstInningsTeam === match.awayTeamName ? match.firstInningsRuns : match.secondInningsRuns)
      : (match.firstInningsTeam === match.homeTeamName ? match.firstInningsRuns : match.secondInningsRuns);
    const opponentWickets = isCurrentTeamHome 
      ? (match.firstInningsTeam === match.awayTeamName ? match.firstInningsWickets : match.secondInningsWickets)
      : (match.firstInningsTeam === match.homeTeamName ? match.firstInningsWickets : match.secondInningsWickets);
    const opponentOvers = isCurrentTeamHome 
      ? (match.firstInningsTeam === match.awayTeamName ? match.firstInningsOvers : match.secondInningsOvers)
      : (match.firstInningsTeam === match.homeTeamName ? match.firstInningsOvers : match.secondInningsOvers);
    
    const opponentName = isCurrentTeamHome ? match.awayTeamName : match.homeTeamName;
    const isTeamWinner = match.winningTeam !== 'Draw' && match.winningTeam === teamName;
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary"
        onClick={() => setLocation(`/match-summary/${match.id}`)}
        data-testid={`team-match-card-${match.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold" data-testid="text-match-teams">
              {match.homeTeamName} vs {match.awayTeamName}
            </CardTitle>
            {match.manOfTheMatchUser && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200" data-testid="badge-mom">
                <Trophy className="w-3 h-3 mr-1" />
                MOM
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span data-testid="text-match-date">{formatDate(match.matchDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span data-testid="text-match-venue">{match.venue}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Match Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-semibold text-sm" data-testid="text-team-name">{teamName}</div>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-team-score">
                {teamScore}/{teamWickets}
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-team-overs">
                ({formatOvers(teamOvers)} ov)
              </div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-semibold text-sm" data-testid="text-opponent-team">{opponentName}</div>
              <div className="text-2xl font-bold text-primary" data-testid="text-opponent-score">
                {opponentScore}/{opponentWickets}
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-opponent-overs">
                ({formatOvers(opponentOvers)} ov)
              </div>
            </div>
          </div>

          {/* Match Result */}
          <div className="text-center">
            <Badge 
              variant={isTeamWinner ? "default" : "secondary"} 
              className="text-sm px-3 py-1"
              data-testid="text-match-result"
            >
              {match.winningTeam === 'Draw' ? 'Match Drawn' : `${match.winningTeam} Won`}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-48"></div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 bg-muted rounded"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
                <div className="h-8 bg-muted rounded w-32 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !matchHistory) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <div className="text-lg font-medium text-muted-foreground mb-2">
          {error ? "Failed to load match history" : "No match history found"}
        </div>
        <div className="text-sm text-muted-foreground">
          {error ? "Please try again later" : "Play some team matches to see them here!"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Match Cards */}
      {matchHistory.matches.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <div className="text-lg font-medium text-muted-foreground mb-2">No team matches yet</div>
          <div className="text-sm text-muted-foreground">
            Create formal team vs team matches to build match history!
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {matchHistory.matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
                  data-testid={`button-page-${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TeamDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState<string>("");
  const [referrerPage, setReferrerPage] = useState<string>("/dashboard");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  // Detect where the user came from
  useEffect(() => {
    const stored = sessionStorage.getItem("teamDetailReferrer");
    if (stored) {
      setReferrerPage(stored);
      // Clear it after use
      sessionStorage.removeItem("teamDetailReferrer");
    }
  }, []);

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams", id],
  });

  const { data: members, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", id, "members"],
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest('DELETE', `/api/teams/${id}/members/${memberId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "The member has been removed from the team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const promoteToViceCaptainMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest('PUT', `/api/teams/${id}/promote-vice-captain`, { memberId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member promoted",
        description: "The member has been promoted to vice captain.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to promote member",
        variant: "destructive",
      });
    },
  });

  const demoteViceCaptainMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', `/api/teams/${id}/demote-vice-captain`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vice captain demoted",
        description: "The vice captain has been demoted to member.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to demote vice captain",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/teams/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team deleted",
        description: "The team has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team",
        variant: "destructive",
      });
    },
  });

  const transferCaptaincyMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest('PUT', `/api/teams/${id}/transfer-captaincy`, { memberId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Captaincy transferred",
        description: "The captaincy has been transferred successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer captaincy",
        variant: "destructive",
      });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest('POST', '/api/invitations', {
        teamId: id,
        username: username
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "Player invitation sent successfully!",
      });
      setIsInviteDialogOpen(false);
      setSearchTerm("");
      setSearchResults([]);
      setSelectedUser(null);
      setShowDropdown(false);
      setSearchError("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (updates: { name?: string; description?: string }) => {
      const response = await apiRequest('PUT', `/api/teams/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team updated",
        description: "Team information updated successfully!",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team",
        variant: "destructive",
      });
    },
  });

  // Live search effect
  useEffect(() => {
    const performLiveSearch = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        setSearchError("");
        return;
      }
      
      try {
        const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
        const users = await response.json();
        
        // Filter out current user and already team members
        const filteredUsers = users.filter((player: any) => 
          player.id !== user?.id && // Exclude current user
          !members?.some(member => member.id === player.id) // Exclude existing members
        );
        
        setSearchResults(filteredUsers.slice(0, 10)); // Limit to 10 results
        setShowDropdown(filteredUsers.length > 0);
        setSearchError("");
      } catch (error) {
        setSearchResults([]);
        setShowDropdown(false);
        setSearchError("Failed to search players");
      }
    };

    const delayedSearch = setTimeout(performLiveSearch, 300); // Debounce search
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, user?.id, members]);

  // Handle user selection from dropdown
  const handleUserSelect = (player: User) => {
    setSelectedUser(player);
    setSearchTerm(player.profileName || player.username || "");
    setShowDropdown(false);
    setSearchError("");
  };

  // Handle manual search button click
  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) {
      setSearchError("Please enter at least 2 characters");
      return;
    }
    
    try {
      const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
      const users = await response.json();
      
      // Filter out current user and already team members
      const filteredUsers = users.filter((player: any) => 
        player.id !== user?.id && // Exclude current user
        !members?.some(member => member.id === player.id) // Exclude existing members
      );
      
      if (filteredUsers.length === 0) {
        setSearchError("No users found with that username");
        setSelectedUser(null);
        setShowDropdown(false);
        return;
      }
      
      // If exact match found, select it
      const exactMatch = filteredUsers.find((u: User) => 
        u.username?.toLowerCase() === searchTerm.trim().toLowerCase() ||
        u.profileName?.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      
      if (exactMatch) {
        handleUserSelect(exactMatch);
      } else {
        setSearchResults(filteredUsers.slice(0, 10));
        setShowDropdown(true);
        setSearchError("");
      }
    } catch (error) {
      setSearchError("Failed to search players");
      setSelectedUser(null);
      setShowDropdown(false);
    }
  };

  // Handle invite action
  const handleInvite = () => {
    if (!selectedUser) {
      setSearchError("Please select a user from the dropdown or search results");
      return;
    }
    
    sendInviteMutation.mutate(selectedUser.username || "");
  };

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isInviteDialogOpen) {
      setSearchTerm("");
      setSearchResults([]);
      setSelectedUser(null);
      setShowDropdown(false);
      setSearchError("");
    }
  }, [isInviteDialogOpen]);

  if (!team || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isCaptain = team.captainId === user?.id;
  const isViceCaptain = team.viceCaptainId === user?.id;
  const canManageMembers = isCaptain || isViceCaptain;

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate(memberId);
  };

  const handlePromoteToViceCaptain = (memberId: string) => {
    promoteToViceCaptainMutation.mutate(memberId);
  };

  const handleDemoteViceCaptain = () => {
    demoteViceCaptainMutation.mutate();
  };

  const handleDeleteTeam = () => {
    deleteTeamMutation.mutate();
  };

  const handleTransferCaptaincy = (memberId: string) => {
    transferCaptaincyMutation.mutate(memberId);
  };

  const handleEditTeam = () => {
    setEditForm({
      name: team?.name || "",
      description: team?.description || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTeam = () => {
    if (!editForm.name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }
    updateTeamMutation.mutate({
      name: editForm.name.trim(),
      description: editForm.description.trim()
    });
  };

  // Group members by role
  const captain = members?.find(member => member.id === team.captainId);
  const viceCaptain = members?.find(member => member.id === team.viceCaptainId);
  const regularMembers = members?.filter(member => 
    member.id !== team.captainId && member.id !== team.viceCaptainId
  ) || [];

  const renderMemberCard = (member: TeamMember, role: 'captain' | 'vice-captain' | 'member') => {
    const isMemberCaptain = member.id === team.captainId;
    const isMemberViceCaptain = member.id === team.viceCaptainId;
    const isCurrentUser = member.id === user?.id;
    
    // Determine what actions the current user can perform
    const canRemove = !isCurrentUser && (
      (isCaptain && !isMemberCaptain) || 
      (isViceCaptain && !isMemberCaptain && !isMemberViceCaptain)
    );
    const canPromote = !isMemberCaptain && !isMemberViceCaptain && (isCaptain || isViceCaptain);
    const canDemote = isMemberViceCaptain && (isCaptain || isViceCaptain);
    const canTransferCaptaincy = isCaptain && !isMemberCaptain;

    return (
      <div
        key={member.id}
        className="group relative p-4 bg-background border border-border rounded-xl hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
        data-testid={`member-${member.id}`}
        onClick={() => setLocation(`/player/${member.id}`)}
      >
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-primary-foreground font-semibold text-lg">
                {(member.profileName || member.username)?.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Online status indicator could go here if needed */}
          </div>
          
          {/* Player Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground text-base truncate pr-2">
                {member.profileName || member.username}
              </h4>
              
              {/* Role Badge */}
              <div className="flex items-center space-x-2 shrink-0">
                {isMemberCaptain && (
                  <Badge variant="default" className="flex items-center space-x-1 bg-yellow-500 hover:bg-yellow-600">
                    <Crown className="h-3 w-3" />
                    <span className="text-xs font-medium">Captain</span>
                  </Badge>
                )}
                {isMemberViceCaptain && (
                  <Badge variant="secondary" className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200">
                    <Shield className="h-3 w-3" />
                    <span className="text-xs font-medium">Vice Captain</span>
                  </Badge>
                )}
                {!isMemberCaptain && !isMemberViceCaptain && (
                  <Badge variant="outline" className="text-xs">Member</Badge>
                )}
              </div>
            </div>
            
            {/* Username and Player Role */}
            <div className="flex items-center space-x-3">
              <p className="text-sm text-muted-foreground font-mono">
                @{member.username}
              </p>
              {member.role && (
                <div className="flex items-center">
                  <div className="w-1 h-1 bg-muted-foreground/40 rounded-full"></div>
                  <Badge variant="outline" className="ml-2 text-xs px-2 py-0.5">
                    {member.role.replace('_', ' ')}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Additional info could go here */}
            {isCurrentUser && (
              <div className="flex items-center space-x-1 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 font-medium">You</span>
              </div>
            )}
          </div>
        </div>

        {/* Action dropdown */}
        {canManageMembers && !isCurrentUser && (canTransferCaptaincy || canPromote || canDemote || canRemove) && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  data-testid={`dropdown-actions-${member.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canTransferCaptaincy && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        data-testid={`action-transfer-captaincy-${member.id}`}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Transfer Captaincy
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Transfer Team Captaincy</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to transfer captaincy to {member.profileName || member.username}? You will become the vice captain and lose captain privileges.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleTransferCaptaincy(member.id)}
                          disabled={transferCaptaincyMutation.isPending}
                          data-testid={`confirm-transfer-${member.id}`}
                        >
                          {transferCaptaincyMutation.isPending ? "Transferring..." : "Transfer Captaincy"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {canPromote && (
                  <DropdownMenuItem
                    onClick={() => handlePromoteToViceCaptain(member.id)}
                    disabled={promoteToViceCaptainMutation.isPending}
                    data-testid={`action-promote-${member.id}`}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Promote to Vice Captain
                  </DropdownMenuItem>
                )}
                {canDemote && (
                  <DropdownMenuItem
                    onClick={handleDemoteViceCaptain}
                    disabled={demoteViceCaptainMutation.isPending}
                    data-testid={`action-demote-${member.id}`}
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Demote to Member
                  </DropdownMenuItem>
                )}
                {canRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                        data-testid={`action-remove-${member.id}`}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove from Team
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {member.profileName || member.username} from the team? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removeMemberMutation.isPending}
                          data-testid={`confirm-remove-${member.id}`}
                        >
                          {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 relative">
      {/* Back button - at the start */}
      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation(referrerPage)}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {referrerPage === "/teams" ? "Back to Teams" : "Back to Dashboard"}
        </Button>
      </div>

      {/* Action Buttons - Top Right Corner */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex gap-2">
        {/* Edit Button - Captain and Vice Captain */}
        {canManageMembers && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditTeam}
            data-testid="button-edit-team"
          >
            <Edit className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        )}
        
        {/* Delete Button - Captain Only */}
        {isCaptain && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                data-testid="button-delete-team"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Delete Team</span>
                <span className="sm:hidden">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Team</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete "{team.name}"? This action cannot be undone. All team members, invitations, and team data will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTeam}
                  disabled={deleteTeamMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="confirm-delete-team"
                >
                  {deleteTeamMutation.isPending ? "Deleting..." : "Delete Team"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Header */}
      <div className="space-y-4">
        {/* Team info and actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pr-16 sm:pr-20">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground break-words" data-testid="title-team-name">
              {team.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {team.description || "No description provided"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {isCaptain && (
              <Badge variant="default" className="flex items-center space-x-1 shrink-0">
                <Crown className="h-3 w-3" />
                <span className="hidden sm:inline">Captain</span>
                <span className="sm:hidden">Cap</span>
              </Badge>
            )}
            {isViceCaptain && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Vice Captain</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Team Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Team Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeamStatistics teamId={id!} />
        </CardContent>
      </Card>

      {/* Team Match History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Team Match History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMatchHistory teamId={id!} teamName={team.name} />
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Team Members</span>
            <Badge variant="outline">{members?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {members && members.length > 0 ? (
              <>
                {/* Captain Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Crown className="mr-2 h-5 w-5 text-yellow-500" />
                    Captain {captain ? '(1)' : '(0)'}
                  </h3>
                  {captain ? (
                    renderMemberCard(captain, 'captain')
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No captain assigned</p>
                    </div>
                  )}
                </div>

                {/* Vice Captain Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-blue-500" />
                    Vice Captain {viceCaptain ? '(1)' : '(0)'}
                  </h3>
                  {viceCaptain ? (
                    renderMemberCard(viceCaptain, 'vice-captain')
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No vice captain assigned</p>
                    </div>
                  )}
                </div>

                {/* Members Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Users className="mr-2 h-5 w-5 text-gray-500" />
                    Members ({regularMembers.length})
                  </h3>
                  {regularMembers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                      {regularMembers.map((member) => renderMemberCard(member, 'member'))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No members yet</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team members found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Floating Invite Button */}
      {canManageMembers && (
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
              size="lg"
              data-testid="button-invite-player"
            >
              <UserPlus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Player to Team</DialogTitle>
              <DialogDescription>
                Search for a player by username and send them an invitation to join {team.name}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search Input with Dropdown */}
              <div className="relative">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search by username or profile name..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedUser(null); // Clear selection when typing
                      }}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      onFocus={() => {
                        if (searchResults.length > 0 && !selectedUser) {
                          setShowDropdown(true);
                        }
                      }}
                      onBlur={(e) => {
                        // Only hide dropdown if not clicking on dropdown items
                        const relatedTarget = e.relatedTarget as HTMLElement;
                        if (!relatedTarget || !relatedTarget.closest('[data-dropdown]')) {
                          setTimeout(() => setShowDropdown(false), 150);
                        }
                      }}
                      data-testid="input-search-username"
                      className={searchError ? "border-red-500" : ""}
                    />
                    
                    {/* Live Search Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                      <div 
                        data-dropdown
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()} // Prevent input from losing focus
                      >
                        {searchResults.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center space-x-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => handleUserSelect(player)}
                            data-testid={`dropdown-item-${player.id}`}
                          >
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground text-sm font-medium">
                                {(player.profileName || player.username)?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {player.profileName || player.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{player.username}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={handleSearch} variant="outline" data-testid="button-search">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Error Message */}
                {searchError && (
                  <p className="text-sm text-red-500 mt-2" data-testid="search-error">
                    {searchError}
                  </p>
                )}
              </div>
              
              {/* Selected User Display */}
              {selectedUser && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {(selectedUser.profileName || selectedUser.username)?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-green-800 dark:text-green-200">
                          {selectedUser.profileName || selectedUser.username}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          @{selectedUser.username}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={handleInvite}
                      disabled={sendInviteMutation.isPending}
                      data-testid="button-invite-selected"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {sendInviteMutation.isPending ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Team Dialog */}
      {canManageMembers && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
              <DialogDescription>
                Update your team's name and description.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  placeholder="Enter team name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  data-testid="input-team-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team-description">Description</Label>
                <Textarea
                  id="team-description"
                  placeholder="Enter team description (optional)"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  data-testid="textarea-team-description"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateTeam}
                disabled={updateTeamMutation.isPending || !editForm.name.trim()}
                data-testid="button-save-team"
              >
                {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}