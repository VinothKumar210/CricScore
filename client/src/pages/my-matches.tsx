import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-context";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Trophy, TrendingUp, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Types based on actual backend response structure
interface UserMatchHistoryResponse {
  matches: {
    matchSummary: {
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
      result: string;
      homeTeam?: { id: string; name: string; } | null;
      awayTeam?: { id: string; name: string; } | null;
      manOfTheMatchUser?: {
        id: string;
        profileName: string;
        username: string;
      } | null;
    };
    userPerformance: {
      runsScored: number;
      ballsFaced: number;
      wicketsTaken: number;
      oversBowled: number;
      runsConceded?: number;
      catchesTaken?: number;
      isManOfTheMatch: boolean;
      teamName: string;
      playerName: string;
    };
  }[];
  totalCount: number;
}

export default function MyMatchesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: matchHistory, isLoading, error } = useQuery<UserMatchHistoryResponse>({
    queryKey: ['user-match-history', user?.id, currentPage, itemsPerPage],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID required');
      const response = await apiRequest(
        'GET',
        `/api/user-match-history/${user.id}?page=${currentPage}&limit=${itemsPerPage}`
      );
      return response.json();
    },
    enabled: !!user?.id,
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
    const wholeOvers = Math.floor(overs);
    const balls = Math.round((overs - wholeOvers) * 6);
    return balls === 0 ? `${wholeOvers}.0` : `${wholeOvers}.${balls}`;
  };

  const getStrikeRate = (runs: number, balls: number): string => {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 100).toFixed(2);
  };

  const getEconomy = (runs: number, overs: number): string => {
    if (overs === 0) return '0.00';
    return (runs / overs).toFixed(2);
  };

  const MatchCard = ({ matchData }: { matchData: UserMatchHistoryResponse['matches'][0] }) => {
    const { matchSummary: match, userPerformance } = matchData;
    
    // Determine scores based on innings structure
    const homeTeamScore = match.firstInningsTeam === match.homeTeamName 
      ? match.firstInningsRuns 
      : match.secondInningsRuns;
    const homeTeamWickets = match.firstInningsTeam === match.homeTeamName 
      ? match.firstInningsWickets 
      : match.secondInningsWickets;
    const homeTeamOvers = match.firstInningsTeam === match.homeTeamName 
      ? match.firstInningsOvers 
      : match.secondInningsOvers;
    
    const awayTeamScore = match.firstInningsTeam === match.awayTeamName 
      ? match.firstInningsRuns 
      : match.secondInningsRuns;
    const awayTeamWickets = match.firstInningsTeam === match.awayTeamName 
      ? match.firstInningsWickets 
      : match.secondInningsWickets;
    const awayTeamOvers = match.firstInningsTeam === match.awayTeamName 
      ? match.firstInningsOvers 
      : match.secondInningsOvers;
    
    const isUserTeamWinner = match.winningTeam !== 'Draw' && 
      (match.winningTeam === match.homeTeamName || match.winningTeam === match.awayTeamName);
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary"
        onClick={() => setLocation(`/match-summary/${match.id}`)}
        data-testid={`match-card-${match.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold" data-testid="text-match-teams">
              {match.homeTeamName} vs {match.awayTeamName}
            </CardTitle>
            {userPerformance.isManOfTheMatch && (
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
              <div className="font-semibold text-sm" data-testid="text-home-team">{match.homeTeamName}</div>
              <div className="text-2xl font-bold text-primary" data-testid="text-home-score">
                {homeTeamScore}/{homeTeamWickets}
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-home-overs">
                ({formatOvers(homeTeamOvers)} ov)
              </div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-semibold text-sm" data-testid="text-away-team">{match.awayTeamName}</div>
              <div className="text-2xl font-bold text-primary" data-testid="text-away-score">
                {awayTeamScore}/{awayTeamWickets}
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-away-overs">
                ({formatOvers(awayTeamOvers)} ov)
              </div>
            </div>
          </div>

          {/* Match Result */}
          <div className="text-center">
            <Badge 
              variant={isUserTeamWinner ? "default" : "secondary"} 
              className="text-sm px-3 py-1"
              data-testid="text-match-result"
            >
              {match.winningTeam === 'Draw' ? 'Match Drawn' : `${match.winningTeam} Won`}
            </Badge>
          </div>

          {/* User Performance - Blue Highlighted Section */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Your Performance
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Batting Stats */}
              {userPerformance.ballsFaced > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">🏏 BATTING</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Runs:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300" data-testid="text-user-runs">
                        {userPerformance.runsScored}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balls:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300" data-testid="text-user-balls">
                        {userPerformance.ballsFaced}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SR:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300" data-testid="text-user-sr">
                        {getStrikeRate(userPerformance.runsScored, userPerformance.ballsFaced)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bowling Stats */}
              {userPerformance.oversBowled > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">⚾ BOWLING</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Wickets:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300" data-testid="text-user-wickets">
                        {userPerformance.wicketsTaken}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overs:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300" data-testid="text-user-overs">
                        {formatOvers(userPerformance.oversBowled)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Economy:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300" data-testid="text-user-economy">
                        {getEconomy(userPerformance.runsConceded || 0, userPerformance.oversBowled)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Fielding Stats */}
              {(userPerformance.catchesTaken || 0) > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">🥎 FIELDING</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Catches:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300" data-testid="text-user-catches">
                        {userPerformance.catchesTaken || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* If no significant performance */}
              {userPerformance.ballsFaced === 0 && userPerformance.oversBowled === 0 && (userPerformance.catchesTaken || 0) === 0 && (
                <div className="col-span-2 text-center text-sm text-blue-600 dark:text-blue-400">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Participated in this match
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Matches</h1>
          <div className="text-muted-foreground">
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !matchHistory) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">My Matches</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground text-lg">
              {error ? "Failed to load your match history." : "No match history found."}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {error ? "Please try again later." : "Start playing matches to see them here!"}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          My Matches
        </h1>
        <div className="text-muted-foreground" data-testid="text-total-matches">
          {matchHistory.totalCount} match{matchHistory.totalCount !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Match Cards */}
      {matchHistory.matches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <div className="text-lg font-semibold mb-2">No matches yet</div>
            <div className="text-muted-foreground mb-6">
              Start playing cricket matches to build your match history!
            </div>
            <Button onClick={() => setLocation('/local-match')} data-testid="button-create-match">
              Create Your First Match
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {matchHistory.matches.map((matchData) => (
            <MatchCard 
              key={matchData.matchSummary.id} 
              matchData={matchData}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
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