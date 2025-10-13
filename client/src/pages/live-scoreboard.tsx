import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Clock, Users, Calendar, MapPin } from "lucide-react";
import { type LocalMatch, type User } from "@shared/schema";
import { useAuth } from "@/components/auth/auth-context";
import { NotificationPermission, useNotificationPermissionState } from "@/components/notifications/notification-permission";

export default function LiveScoreboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { shouldShow: showNotificationPermission, dismiss: dismissNotificationPermission } = useNotificationPermissionState();

  // Fetch ongoing matches where user is a spectator
  const { data: spectatorMatches, isLoading: spectatorMatchesLoading, error: spectatorError } = useQuery<
    (LocalMatch & { 
      creator: User;
      myTeam?: { name: string; id: string };
      opponentTeam?: { name: string; id: string };
    })[]
  >({
    queryKey: ["/api/local-matches/spectator"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch all ongoing matches for discovery
  const { data: ongoingMatches, isLoading: ongoingMatchesLoading, error: ongoingError } = useQuery<
    (LocalMatch & { 
      creator: User;
      myTeam?: { name: string; id: string };
      opponentTeam?: { name: string; id: string };
    })[]
  >({
    queryKey: ["/api/local-matches/ongoing"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Debug logging
  console.log("LiveScoreboard - User:", user ? `${user.username} (${user.id})` : 'Not authenticated');
  console.log("LiveScoreboard - Spectator matches:", { spectatorMatches, spectatorMatchesLoading, spectatorError });
  console.log("LiveScoreboard - Ongoing matches:", { ongoingMatches, ongoingMatchesLoading, ongoingError });

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case "ONGOING":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Live</Badge>;
      case "CREATED":
        return <Badge variant="secondary">Starting Soon</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const MatchCard = ({ 
    match, 
    isSpectating = false 
  }: { 
    match: LocalMatch & { 
      creator: User;
      myTeam?: { name: string; id: string };
      opponentTeam?: { name: string; id: string };
    };
    isSpectating?: boolean;
  }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/match-view/${match.id}`)} data-testid={`card-match-${match.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg" data-testid={`text-match-name-${match.id}`}>{match.matchName}</CardTitle>
          <div data-testid={`badge-status-${match.id}`}>
            {getMatchStatusBadge(match.status)}
          </div>
        </div>
        <div className="flex items-center text-sm text-muted-foreground space-x-4">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span data-testid={`text-date-${match.id}`}>{formatDate(match.matchDate)}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span data-testid={`text-venue-${match.id}`}>{match.venue}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Teams and Score */}
          <div className="space-y-3">
            {/* My Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-medium" data-testid={`text-team1-name-${match.id}`}>
                  {match.myTeam?.name || match.myTeamName || "My Team"}
                </span>
              </div>
              {match.status === "ONGOING" && (
                <div className="text-right" data-testid={`score-team1-${match.id}`}>
                  <span className="text-xl font-bold">{match.myTeamScore}</span>
                  <span className="text-sm text-muted-foreground">/{match.myTeamWickets}</span>
                  <div className="text-xs text-muted-foreground">({match.myTeamOvers} overs)</div>
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="text-center text-xs text-muted-foreground">VS</div>

            {/* Opponent Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="font-medium" data-testid={`text-team2-name-${match.id}`}>
                  {match.opponentTeam?.name || match.opponentTeamName || "Opponent Team"}
                </span>
              </div>
              {match.status === "ONGOING" && (
                <div className="text-right" data-testid={`score-team2-${match.id}`}>
                  <span className="text-xl font-bold">{match.opponentTeamScore}</span>
                  <span className="text-sm text-muted-foreground">/{match.opponentTeamWickets}</span>
                  <div className="text-xs text-muted-foreground">({match.opponentTeamOvers} overs)</div>
                </div>
              )}
            </div>
          </div>

          {/* Match Details */}
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span data-testid={`text-creator-${match.id}`}>Created by {match.creator.profileName || match.creator.username}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span data-testid={`text-overs-${match.id}`}>{match.overs} overs</span>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            className="w-full" 
            variant={isSpectating ? "default" : "outline"}
            data-testid={`button-watch-match-${match.id}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isSpectating ? "Continue Watching" : "Watch Live"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground" data-testid="title-live-scoreboard">
          Live Scoreboard
        </h2>
        <p className="text-muted-foreground mt-2">
          Watch ongoing cricket matches in real-time
        </p>
      </div>

      {/* Notification Permission Card */}
      {showNotificationPermission && (
        <div className="mb-6">
          <NotificationPermission onDismiss={dismissNotificationPermission} />
        </div>
      )}

      <Tabs defaultValue="my-matches" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-matches" data-testid="tab-my-matches">
            My Spectating ({spectatorMatches?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="all-matches" data-testid="tab-all-matches">
            All Live Matches ({ongoingMatches?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* My Spectating Matches */}
        <TabsContent value="my-matches" className="space-y-4">
          {spectatorMatchesLoading ? (
            <div className="text-center py-8" data-testid="loading-spectator-matches">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading your matches...</p>
            </div>
          ) : spectatorMatches && spectatorMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="spectator-matches-grid">
              {spectatorMatches.map((match) => (
                <MatchCard key={match.id} match={match} isSpectating={true} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center" data-testid="no-spectator-matches">
              <div className="flex flex-col items-center space-y-3">
                <Eye className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No matches to watch</h3>
                <p className="text-muted-foreground">
                  You're not spectating any matches at the moment. Check out live matches in the "All Live Matches" tab.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* All Live Matches */}
        <TabsContent value="all-matches" className="space-y-4">
          {ongoingMatchesLoading ? (
            <div className="text-center py-8" data-testid="loading-ongoing-matches">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading live matches...</p>
            </div>
          ) : ongoingMatches && ongoingMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="ongoing-matches-grid">
              {ongoingMatches.map((match) => (
                <MatchCard key={match.id} match={match} isSpectating={false} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center" data-testid="no-ongoing-matches">
              <div className="flex flex-col items-center space-y-3">
                <Clock className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No live matches</h3>
                <p className="text-muted-foreground">
                  There are no ongoing matches at the moment. Check back later or create your own match!
                </p>
                <Button onClick={() => setLocation('/local-match')} className="mt-4" data-testid="button-create-match">
                  Create New Match
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}