import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Clock, MapPin, Calendar, Users, TrendingUp, Target, Zap } from "lucide-react";
import { type LocalMatch, type User, type OverHistory } from "@shared/schema";
import { useAuth } from "@/components/auth/auth-context";

export default function MatchView() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/match-view/:id");
  const matchId = params?.id;

  // Fetch match details
  const { data: matchData, isLoading: matchLoading } = useQuery<
    LocalMatch & { 
      creator: User;
      myTeam?: { name: string; id: string };
      opponentTeam?: { name: string; id: string };
      myTeamPlayers: {
        name: string;
        runsScored?: number;
        ballsFaced?: number;
        oversBowled?: number;
        runsConceded?: number;
        wicketsTaken?: number;
      }[];
      opponentTeamPlayers: {
        name: string;
        runsScored?: number;
        ballsFaced?: number;
        oversBowled?: number;
        runsConceded?: number;
        wicketsTaken?: number;
      }[];
      overHistory: OverHistory[];
    }
  >({
    queryKey: [`/api/local-matches/${matchId}`],
    enabled: !!matchId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  if (!match) {
    setLocation('/live-scoreboard');
    return null;
  }

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case "ONGOING":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Live</Badge>;
      case "CREATED":
        return <Badge variant="secondary">Starting Soon</Badge>;
      case "COMPLETED":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateStrikeRate = (runs: number, balls: number) => {
    if (balls === 0) return 0;
    return ((runs / balls) * 100).toFixed(1);
  };

  const calculateEconomyRate = (runs: number, overs: number) => {
    if (overs === 0) return 0;
    return (runs / overs).toFixed(1);
  };

  if (matchLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">Match not found</h3>
          <p className="text-muted-foreground mt-2">The match you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation('/live-scoreboard')} className="mt-4">
            Back to Live Scoreboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/live-scoreboard')}
            className="mr-4"
            data-testid="button-back-to-live-scoreboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-foreground" data-testid="title-match-view">
              {matchData.matchName}
            </h2>
            {getMatchStatusBadge(matchData.status)}
          </div>
        </div>
        
        {/* Match Info */}
        <div className="flex items-center text-sm text-muted-foreground space-x-6">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(matchData.matchDate)}
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {matchData.venue}
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {matchData.overs} overs
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            Created by {matchData.creator.profileName || matchData.creator.username}
          </div>
        </div>
      </div>

      <Tabs defaultValue="scoreboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scoreboard" data-testid="tab-scoreboard">Main Scoreboard</TabsTrigger>
          <TabsTrigger value="batting" data-testid="tab-batting">Batting Stats</TabsTrigger>
          <TabsTrigger value="bowling" data-testid="tab-bowling">Bowling Stats</TabsTrigger>
          <TabsTrigger value="overs" data-testid="tab-overs">Over Timeline</TabsTrigger>
        </TabsList>

        {/* Main Scoreboard */}
        <TabsContent value="scoreboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Team Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span>{matchData.myTeam?.name || matchData.myTeamName || "My Team"}</span>
                  </div>
                  {matchData.currentInnings === 1 && <Badge variant="secondary">Batting</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{matchData.myTeamScore}</div>
                    <div className="text-lg text-muted-foreground">
                      for {matchData.myTeamWickets} wicket{matchData.myTeamWickets !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ({matchData.myTeamOvers} overs)
                    </div>
                  </div>
                  
                  {matchData.status === "ONGOING" && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium">Run Rate</div>
                        <div className="text-lg">{calculateEconomyRate(matchData.myTeamScore, matchData.myTeamOvers)}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Required Rate</div>
                        <div className="text-lg">
                          {matchData.currentInnings === 2 
                            ? calculateEconomyRate(
                                (matchData.opponentTeamScore + 1) - matchData.myTeamScore, 
                                matchData.overs - matchData.myTeamOvers
                              )
                            : "-"
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Opponent Team Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span>{matchData.opponentTeam?.name || matchData.opponentTeamName || "Opponent Team"}</span>
                  </div>
                  {matchData.currentInnings === 2 && <Badge variant="secondary">Batting</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{matchData.opponentTeamScore}</div>
                    <div className="text-lg text-muted-foreground">
                      for {matchData.opponentTeamWickets} wicket{matchData.opponentTeamWickets !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ({matchData.opponentTeamOvers} overs)
                    </div>
                  </div>
                  
                  {matchData.status === "ONGOING" && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium">Run Rate</div>
                        <div className="text-lg">{calculateEconomyRate(matchData.opponentTeamScore, matchData.opponentTeamOvers)}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Required Rate</div>
                        <div className="text-lg">
                          {matchData.currentInnings === 1 
                            ? calculateEconomyRate(
                                (matchData.myTeamScore + 1) - matchData.opponentTeamScore, 
                                matchData.overs - matchData.opponentTeamOvers
                              )
                            : "-"
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Match Status */}
          {matchData.status === "ONGOING" && (
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-lg">
                    <span className="font-medium">Over {Math.floor(matchData.currentOver)}.{matchData.currentBall}</span>
                    <span className="text-muted-foreground ml-2">• Innings {matchData.currentInnings}</span>
                  </div>
                  {matchData.currentInnings === 2 && (
                    <div className="text-sm text-muted-foreground">
                      {matchData.myTeamScore > matchData.opponentTeamScore 
                        ? `${matchData.myTeam?.name || "My Team"} needs ${(matchData.opponentTeamScore + 1) - matchData.myTeamScore} runs to win`
                        : `${matchData.opponentTeam?.name || "Opponent Team"} needs ${(matchData.myTeamScore + 1) - matchData.opponentTeamScore} runs to win`
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Batting Stats */}
        <TabsContent value="batting" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
                  {matchData.myTeam?.name || matchData.myTeamName || "My Team"} Batting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Balls</TableHead>
                      <TableHead className="text-right">SR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchData.myTeamPlayers.slice(0, 6).map((player: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="text-right">{player.runsScored || 0}</TableCell>
                        <TableCell className="text-right">{player.ballsFaced || 0}</TableCell>
                        <TableCell className="text-right">
                          {calculateStrikeRate(player.runsScored || 0, player.ballsFaced || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-red-600" />
                  {matchData.opponentTeam?.name || matchData.opponentTeamName || "Opponent Team"} Batting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Balls</TableHead>
                      <TableHead className="text-right">SR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchData.opponentTeamPlayers.slice(0, 6).map((player: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="text-right">{player.runsScored || 0}</TableCell>
                        <TableCell className="text-right">{player.ballsFaced || 0}</TableCell>
                        <TableCell className="text-right">
                          {calculateStrikeRate(player.runsScored || 0, player.ballsFaced || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bowling Stats */}
        <TabsContent value="bowling" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-green-600" />
                  {matchData.myTeam?.name || matchData.myTeamName || "My Team"} Bowling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Overs</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Wickets</TableHead>
                      <TableHead className="text-right">Econ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchData.myTeamPlayers.filter((p: any) => (p.oversBowled || 0) > 0).map((player: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="text-right">{player.oversBowled || 0}</TableCell>
                        <TableCell className="text-right">{player.runsConceded || 0}</TableCell>
                        <TableCell className="text-right">{player.wicketsTaken || 0}</TableCell>
                        <TableCell className="text-right">
                          {calculateEconomyRate(player.runsConceded || 0, player.oversBowled || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-red-600" />
                  {matchData.opponentTeam?.name || matchData.opponentTeamName || "Opponent Team"} Bowling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Overs</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Wickets</TableHead>
                      <TableHead className="text-right">Econ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchData.opponentTeamPlayers.filter((p: any) => (p.oversBowled || 0) > 0).map((player: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="text-right">{player.oversBowled || 0}</TableCell>
                        <TableCell className="text-right">{player.runsConceded || 0}</TableCell>
                        <TableCell className="text-right">{player.wicketsTaken || 0}</TableCell>
                        <TableCell className="text-right">
                          {calculateEconomyRate(player.runsConceded || 0, player.oversBowled || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Over Timeline */}
        <TabsContent value="overs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-5 w-5 text-blue-600" />
                Over by Over Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchData.overHistory && matchData.overHistory.length > 0 ? (
                <div className="space-y-4">
                  {matchData.overHistory.map((over: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          Over {over.overNumber} • Innings {over.innings}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {over.totalRuns} runs • {over.wickets} wicket{over.wickets !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ball by ball: {Array.isArray(over.balls) ? over.balls.join(', ') : 'No ball data'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No over data available</h3>
                  <p className="text-muted-foreground">
                    Ball-by-ball data will appear here once the match starts.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}