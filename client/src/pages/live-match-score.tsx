import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Users, Target, Clock, Send, Play, Pause, CheckCircle, Eye, Bell } from "lucide-react";

interface LiveMatch {
  id: string;
  matchName: string;
  myTeamName: string;
  opponentTeamName: string;
  totalOvers: number;
  currentScore?: {
    runs: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
  status: 'scheduled' | 'live' | 'completed';
  spectatorUsernames: string[];
  createdAt: string;
  matchDate: string;
}

interface LiveMatchBall {
  id: string;
  liveMatchId: string;
  overNumber: number;
  ballInOver: number;
  runs: number;
  isWicket: boolean;
  isExtra: boolean;
  extraType?: string;
  batsmanName?: string;
  bowlerName?: string;
  commentary?: string;
  timestamp: string;
}

interface BallInput {
  runs: number;
  isWicket: boolean;
  isExtra: boolean;
  extraType?: string;
  batsmanName?: string;
  bowlerName?: string;
  commentary?: string;
}

export default function LiveMatchScore() {
  const [match, params] = useRoute("/live-match/:id/score");
  const matchId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Ball input form state
  const [ballInput, setBallInput] = useState<BallInput>({
    runs: 0,
    isWicket: false,
    isExtra: false,
    extraType: '',
    batsmanName: '',
    bowlerName: '',
    commentary: ''
  });

  // Fetch match data
  const { data: matchData, isLoading: isMatchLoading } = useQuery<LiveMatch>({
    queryKey: ['/api/live-matches', matchId],
    enabled: !!matchId,
  });

  // Fetch ball-by-ball data
  const { data: ballsData } = useQuery<LiveMatchBall[]>({
    queryKey: ['/api/live-matches', matchId, 'balls'],
    enabled: !!matchId,
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (!matchId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      console.log('WebSocket connected for live match scoring');
      setIsConnected(true);
      
      // Join this match room for broadcasting
      ws.send(JSON.stringify({
        type: 'join_live_match',
        matchId: matchId
      }));
    });

    ws.addEventListener('close', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    });

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [matchId]);

  // Add ball mutation
  const addBallMutation = useMutation({
    mutationFn: async (ballData: BallInput) => {
      if (!matchData) throw new Error('Match data not available');
      
      const currentScore = matchData.currentScore || { runs: 0, wickets: 0, overs: 0, ballsInOver: 0 };
      
      // Calculate next ball position
      let nextBallInOver = currentScore.ballsInOver + 1;
      let nextOverNumber = currentScore.overs + 1;
      
      // Handle over completion (6 legal balls per over)
      if (nextBallInOver > 6) {
        nextBallInOver = 1;
        nextOverNumber += 1;
      }
      
      // If it's an extra (wide/no-ball), don't advance the ball count
      if (ballData.isExtra && (ballData.extraType === 'wide' || ballData.extraType === 'no-ball')) {
        nextBallInOver = currentScore.ballsInOver || 1;
        nextOverNumber = currentScore.overs + 1;
      }

      const response = await fetch(`/api/live-matches/${matchId}/balls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ...ballData,
          overNumber: nextOverNumber,
          ballInOver: nextBallInOver,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add ball');
      }

      return response.json();
    },
    onSuccess: () => {
      // Reset form
      setBallInput({
        runs: 0,
        isWicket: false,
        isExtra: false,
        extraType: '',
        batsmanName: '',
        bowlerName: '',
        commentary: ''
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/live-matches', matchId] });
      queryClient.invalidateQueries({ queryKey: ['/api/live-matches', matchId, 'balls'] });
      
      toast({
        title: "Ball recorded!",
        description: "The ball has been recorded and spectators have been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record ball",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Start/Update match status mutation
  const updateMatchStatusMutation = useMutation({
    mutationFn: async (newStatus: 'live' | 'completed') => {
      const response = await fetch(`/api/live-matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update match status');
      }

      return response.json();
    },
    onSuccess: (updatedMatch) => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-matches', matchId] });
      
      toast({
        title: "Match status updated!",
        description: `Match is now ${updatedMatch.status}. Spectators have been notified.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update match",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Send notifications to spectators
  const sendNotificationMutation = useMutation({
    mutationFn: async ({ title, body }: { title: string; body: string }) => {
      const response = await fetch(`/api/live-matches/${matchId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ 
          title, 
          body,
          data: { matchId } 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send notifications');
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Notifications sent!",
        description: `Sent to ${result.sent} spectators${result.errors > 0 ? ` (${result.errors} failed)` : ''}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send notifications",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddBall = () => {
    if (!ballInput.batsmanName?.trim() || !ballInput.bowlerName?.trim()) {
      toast({
        title: "Missing player names",
        description: "Please enter both batsman and bowler names.",
        variant: "destructive",
      });
      return;
    }

    addBallMutation.mutate(ballInput);
  };

  const handleStartMatch = () => {
    updateMatchStatusMutation.mutate('live');
    sendNotificationMutation.mutate({
      title: `${matchData?.matchName} Started!`,
      body: `Live match between ${matchData?.myTeamName} vs ${matchData?.opponentTeamName} has started. Follow the action now!`
    });
  };

  const handleEndMatch = () => {
    updateMatchStatusMutation.mutate('completed');
  };

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Match not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isMatchLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Live match not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentScore = matchData.currentScore || { runs: 0, wickets: 0, overs: 0, ballsInOver: 0 };
  const runRate = currentScore.overs > 0 ? (currentScore.runs / (currentScore.overs + currentScore.ballsInOver / 6)).toFixed(2) : '0.00';
  const oversCompleted = currentScore.overs + (currentScore.ballsInOver / 6);
  const progressPercentage = (oversCompleted / matchData.totalOvers) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const recentBalls = ballsData ? 
    [...ballsData].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10) 
    : [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl" data-testid="live-match-score">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-2"
            data-testid="button-back"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-match-name">{matchData.matchName}</h1>
          <p className="text-muted-foreground" data-testid="text-match-date">
            {new Date(matchData.matchDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(matchData.status)} data-testid="badge-match-status">
            {matchData.status.toUpperCase()}
          </Badge>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-view-spectators">
                <Eye className="w-4 h-4 mr-1" />
                {matchData.spectatorUsernames.length} Spectators
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Match Spectators</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {matchData.spectatorUsernames.map((username, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <Users className="w-4 h-4" />
                    <span>@{username}</span>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Live Score Card */}
      <Card className="mb-6" data-testid="card-live-score">
        <CardHeader>
          <CardTitle className="text-center">Live Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold" data-testid="text-current-score">
              {currentScore.runs}/{currentScore.wickets}
            </div>
            <div className="text-lg text-muted-foreground" data-testid="text-overs-info">
              {currentScore.overs}.{currentScore.ballsInOver} overs ({matchData.totalOvers} overs match)
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Run Rate</p>
                <p className="font-semibold" data-testid="text-run-rate">{runRate}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="font-semibold">{progressPercentage.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {matchData.status === 'scheduled' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="h-16" data-testid="button-start-match">
                <div className="text-center">
                  <Play className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm">Start Match</div>
                </div>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start Live Match</AlertDialogTitle>
                <AlertDialogDescription>
                  This will notify all {matchData.spectatorUsernames.length} spectators that the match has started. Are you ready?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStartMatch}>Start Match</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {matchData.status === 'live' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-16" data-testid="button-end-match">
                <div className="text-center">
                  <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm">End Match</div>
                </div>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End Live Match</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the match as completed and notify all spectators. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleEndMatch}>End Match</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <Button 
          variant="outline" 
          className="h-16"
          onClick={() => setLocation(`/live-match/${matchId}/view`)}
          data-testid="button-spectator-view"
        >
          <div className="text-center">
            <Eye className="w-6 h-6 mx-auto mb-1" />
            <div className="text-sm">Spectator View</div>
          </div>
        </Button>

        <Button 
          variant="outline" 
          className="h-16"
          onClick={() => sendNotificationMutation.mutate({
            title: "Match Update",
            body: `Current score: ${currentScore.runs}/${currentScore.wickets} (${currentScore.overs}.${currentScore.ballsInOver} overs)`
          })}
          disabled={sendNotificationMutation.isPending}
          data-testid="button-notify-spectators"
        >
          <div className="text-center">
            <Bell className="w-6 h-6 mx-auto mb-1" />
            <div className="text-sm">Notify All</div>
          </div>
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ball Input Form */}
        <Card data-testid="card-ball-input">
          <CardHeader>
            <CardTitle>Record Ball</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batsman">Batsman *</Label>
                <Input
                  id="batsman"
                  value={ballInput.batsmanName}
                  onChange={(e) => setBallInput(prev => ({ ...prev, batsmanName: e.target.value }))}
                  placeholder="Batsman name"
                  data-testid="input-batsman"
                />
              </div>
              <div>
                <Label htmlFor="bowler">Bowler *</Label>
                <Input
                  id="bowler"
                  value={ballInput.bowlerName}
                  onChange={(e) => setBallInput(prev => ({ ...prev, bowlerName: e.target.value }))}
                  placeholder="Bowler name"
                  data-testid="input-bowler"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="runs">Runs</Label>
                <Select 
                  value={ballInput.runs.toString()} 
                  onValueChange={(value) => setBallInput(prev => ({ ...prev, runs: parseInt(value) }))}
                >
                  <SelectTrigger data-testid="select-runs">
                    <SelectValue placeholder="Select runs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 runs</SelectItem>
                    <SelectItem value="1">1 run</SelectItem>
                    <SelectItem value="2">2 runs</SelectItem>
                    <SelectItem value="3">3 runs</SelectItem>
                    <SelectItem value="4">4 runs (boundary)</SelectItem>
                    <SelectItem value="5">5 runs</SelectItem>
                    <SelectItem value="6">6 runs (six)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="wicket" 
                    checked={ballInput.isWicket}
                    onCheckedChange={(checked) => setBallInput(prev => ({ ...prev, isWicket: !!checked }))}
                    data-testid="checkbox-wicket"
                  />
                  <Label htmlFor="wicket">Wicket</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="extra" 
                    checked={ballInput.isExtra}
                    onCheckedChange={(checked) => setBallInput(prev => ({ ...prev, isExtra: !!checked }))}
                    data-testid="checkbox-extra"
                  />
                  <Label htmlFor="extra">Extra</Label>
                </div>
              </div>
            </div>

            {ballInput.isExtra && (
              <div>
                <Label htmlFor="extraType">Extra Type</Label>
                <Select 
                  value={ballInput.extraType} 
                  onValueChange={(value) => setBallInput(prev => ({ ...prev, extraType: value }))}
                >
                  <SelectTrigger data-testid="select-extra-type">
                    <SelectValue placeholder="Select extra type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wide">Wide</SelectItem>
                    <SelectItem value="no-ball">No Ball</SelectItem>
                    <SelectItem value="bye">Bye</SelectItem>
                    <SelectItem value="leg-bye">Leg Bye</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="commentary">Commentary (optional)</Label>
              <Textarea
                id="commentary"
                value={ballInput.commentary}
                onChange={(e) => setBallInput(prev => ({ ...prev, commentary: e.target.value }))}
                placeholder="Add ball commentary..."
                rows={2}
                data-testid="textarea-commentary"
              />
            </div>

            <Button 
              onClick={handleAddBall}
              disabled={addBallMutation.isPending || matchData.status !== 'live'}
              className="w-full"
              data-testid="button-record-ball"
            >
              {addBallMutation.isPending ? (
                <>Recording...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Record Ball
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Balls */}
        <Card data-testid="card-recent-balls">
          <CardHeader>
            <CardTitle>Recent Balls</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {recentBalls.length > 0 ? (
                <div className="space-y-3">
                  {recentBalls.map((ball, index) => (
                    <div key={ball.id} className="flex justify-between items-start p-3 border rounded-lg" data-testid={`recent-ball-${index}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" data-testid={`badge-over-${index}`}>
                            {ball.overNumber}.{ball.ballInOver}
                          </Badge>
                          <span className="font-medium">
                            {ball.isWicket ? 'WICKET!' : 
                             ball.runs === 6 ? 'SIX!' :
                             ball.runs === 4 ? 'FOUR!' :
                             `${ball.runs} run${ball.runs !== 1 ? 's' : ''}`}
                          </span>
                          {ball.isExtra && (
                            <Badge variant="secondary" className="text-xs">
                              {ball.extraType}
                            </Badge>
                          )}
                        </div>
                        {ball.commentary && (
                          <p className="text-sm text-muted-foreground mb-1">{ball.commentary}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {ball.batsmanName} • {ball.bowlerName}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ball.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No balls recorded yet. Start scoring to see updates here.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}