import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Clock, Users, Calendar, MapPin, Lock, Play, ArrowUpRight } from "lucide-react";
import { type LocalMatch, type User } from "@shared/schema";
import { useAuth } from "@/components/auth/auth-context";
import { PasswordDialog } from "@/components/match/password-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LiveScoreboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Fetch ongoing matches
  const { data: ongoingMatches, isLoading } = useQuery<
    (LocalMatch & { 
      creator: User;
      spectators?: any[];
      myTeam?: { name: string; id: string };
      opponentTeam?: { name: string; id: string };
    })[]
  >({
    queryKey: ["/api/local-matches/ongoing"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Join room match mutation
  const joinRoomMutation = useMutation({
    mutationFn: async ({ matchId, password }: { matchId: string; password?: string }) => {
      const response = await apiRequest('POST', `/api/local-matches/${matchId}/spectators`, { 
        userId: user?.id,
        password 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You've joined the match room!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/local-matches/ongoing"] });
      setPasswordDialogOpen(false);
      if (selectedMatch) {
        setLocation(`/match-view/${selectedMatch.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join match room. Please check the password.",
        variant: "destructive",
      });
      setIsJoining(false);
    },
  });

  const handleJoinMatch = (match: any) => {
    setSelectedMatch(match);
    
    if (match.isRoomMatch) {
      setPasswordDialogOpen(true);
    } else {
      joinRoomMutation.mutate({ matchId: match.id });
    }
  };

  const handlePasswordSubmit = (password: string) => {
    if (selectedMatch) {
      setIsJoining(true);
      joinRoomMutation.mutate({ matchId: selectedMatch.id, password });
    }
  };

  return (
    <div className="container-responsive content-spacing pb-24 sm:pb-8">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="title-live-scoreboard">
          Live Match Rooms
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Join and watch ongoing cricket matches in real-time
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Finding live matches...</p>
        </div>
      ) : ongoingMatches && ongoingMatches.length > 0 ? (
        <div className="grid grid-cols-1 gap-4" data-testid="ongoing-matches-grid">
          {ongoingMatches.map((match) => (
            <Card 
              key={match.id} 
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid={`card-match-${match.id}`}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <Badge variant="default" className="bg-red-50 text-red-700 border-red-200 text-xs">
                          LIVE
                        </Badge>
                        {match.isRoomMatch && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground truncate" data-testid={`text-match-name-${match.id}`}>
                        {match.matchName || `${match.myTeamName} vs ${match.opponentTeamName}`}
                      </h3>
                    </div>
                  </div>

                  {/* Teams and Score */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                        <span className="font-semibold text-sm truncate" data-testid={`text-team1-name-${match.id}`}>
                          {match.myTeam?.name || match.myTeamName || "Team 1"}
                        </span>
                      </div>
                      {match.status === "ONGOING" && (
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-black">{match.myTeamScore}</span>
                            <span className="text-sm text-muted-foreground">/{match.myTeamWickets}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{match.myTeamOvers} overs</div>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-xs font-semibold text-muted-foreground">VS</div>

                    <div className="flex items-center justify-between gap-4 p-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 rounded-xl">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                        <span className="font-semibold text-sm truncate" data-testid={`text-team2-name-${match.id}`}>
                          {match.opponentTeam?.name || match.opponentTeamName || "Team 2"}
                        </span>
                      </div>
                      {match.status === "ONGOING" && (
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-black">{match.opponentTeamScore}</span>
                            <span className="text-sm text-muted-foreground">/{match.opponentTeamWickets}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{match.opponentTeamOvers} overs</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="flex items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{match.venue}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{match.overs} overs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{match.spectators?.length || 0} watching</span>
                    </div>
                  </div>

                  {/* Join Button */}
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinMatch(match);
                    }}
                    className="w-full h-12 sm:h-14 rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary-hover hover:to-blue-600 shadow-lg hover:shadow-xl transition-all duration-300"
                    data-testid={`button-join-match-${match.id}`}
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {match.isRoomMatch ? "Join Room" : "Watch Live"}
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center">
                <Eye className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">No Live Matches</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  No matches are currently being played. Create one to get started!
                </p>
              </div>
              <Button 
                onClick={() => setLocation('/local-match')} 
                className="h-12 px-6"
                data-testid="button-create-match"
              >
                <Play className="w-4 h-4 mr-2" />
                Create Match
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setSelectedMatch(null);
          setIsJoining(false);
        }}
        onSubmit={handlePasswordSubmit}
        matchName={selectedMatch?.matchName || ''}
        isLoading={isJoining}
      />
    </div>
  );
}
