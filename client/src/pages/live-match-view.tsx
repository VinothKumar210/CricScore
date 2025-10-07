import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Target, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { initializeNotifications } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

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

interface WebSocketMessage {
  type: 'match_update' | 'ball_update';
  match?: LiveMatch;
  ball?: LiveMatchBall;
  currentScore?: {
    runs: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
}

export default function LiveMatchView() {
  const [match, params] = useRoute("/live-match/:id/view");
  const matchId = params?.id;
  const [isConnected, setIsConnected] = useState(false);
  const [liveScore, setLiveScore] = useState<LiveMatch['currentScore'] | null>(null);
  const [recentBalls, setRecentBalls] = useState<LiveMatchBall[]>([]);
  const { toast } = useToast();

  // Fetch initial match data
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
    const socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      console.log('WebSocket connected for live match view');
      setIsConnected(true);
      
      // Subscribe to this specific match updates
      socket.send(JSON.stringify({
        type: 'subscribe_to_match',
        matchId: matchId
      }));
    });

    socket.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        if (message.type === 'ball_update' && message.ball && message.currentScore) {
          // Update live score
          setLiveScore(message.currentScore);
          
          // Add new ball to recent balls list
          setRecentBalls(prev => [message.ball!, ...prev.slice(0, 19)]); // Keep last 20 balls
          
          // Show toast notification for new ball
          const ballText = message.ball.isWicket ? 'WICKET!' : 
                          message.ball.runs === 6 ? 'SIX!' :
                          message.ball.runs === 4 ? 'FOUR!' :
                          `${message.ball.runs} run${message.ball.runs !== 1 ? 's' : ''}`;
          
          toast({
            title: "Live Update",
            description: `Over ${message.ball.overNumber}.${message.ball.ballInOver}: ${ballText}`,
            duration: 3000,
          });
        }
        
        if (message.type === 'match_update' && message.match) {
          // Match status or details updated
          if (message.match.currentScore) {
            setLiveScore(message.match.currentScore);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    socket.addEventListener('close', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, [matchId, toast]);

  // Initialize live score from match data
  useEffect(() => {
    if (matchData?.currentScore) {
      setLiveScore(matchData.currentScore);
    }
  }, [matchData]);

  // Initialize recent balls from balls data
  useEffect(() => {
    if (ballsData) {
      // Sort by timestamp descending and take last 20
      const sortedBalls = [...ballsData].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setRecentBalls(sortedBalls.slice(0, 20));
    }
  }, [ballsData]);

  // Initialize push notifications on component mount
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Get current user info from localStorage
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Decode token to get username (simplified)
          const payload = JSON.parse(atob(token.split('.')[1]));
          const username = payload.username;
          
          if (username) {
            await initializeNotifications(username);
          }
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    setupNotifications();
  }, []);

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

  const currentScore = liveScore || matchData.currentScore || { runs: 0, wickets: 0, overs: 0, ballsInOver: 0 };
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

  const formatBallDescription = (ball: LiveMatchBall) => {
    let description = '';
    if (ball.isWicket) {
      description = 'WICKET!';
    } else if (ball.runs === 6) {
      description = 'SIX!';
    } else if (ball.runs === 4) {
      description = 'FOUR!';
    } else {
      description = `${ball.runs} run${ball.runs !== 1 ? 's' : ''}`;
    }
    
    if (ball.isExtra) {
      description += ` (${ball.extraType})`;
    }
    
    return description;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl" data-testid="live-match-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-match-name">{matchData.matchName}</h1>
          <p className="text-muted-foreground" data-testid="text-match-date">
            {new Date(matchData.matchDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(matchData.status)} data-testid="badge-match-status">
            {matchData.status.toUpperCase()}
          </Badge>
          <div className="flex items-center gap-1" data-testid="connection-status">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
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
                <p className="text-sm text-muted-foreground">Required Rate</p>
                <p className="font-semibold" data-testid="text-required-rate">N/A</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Match Progress</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card data-testid="card-my-team">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              {matchData.myTeamName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Batting Team</p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-opponent-team">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              {matchData.opponentTeamName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Bowling Team</p>
          </CardContent>
        </Card>
      </div>

      {/* Ball by Ball Commentary */}
      <Card data-testid="card-ball-commentary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Ball by Ball Commentary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {recentBalls.length > 0 ? (
              <div className="space-y-3">
                {recentBalls.map((ball, index) => (
                  <div key={ball.id || index} className="flex justify-between items-start p-3 border rounded-lg" data-testid={`ball-update-${index}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" data-testid={`badge-over-${index}`}>
                          {ball.overNumber}.{ball.ballInOver}
                        </Badge>
                        <span className="font-medium" data-testid={`text-ball-description-${index}`}>
                          {formatBallDescription(ball)}
                        </span>
                      </div>
                      {ball.commentary && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-commentary-${index}`}>
                          {ball.commentary}
                        </p>
                      )}
                      {(ball.batsmanName || ball.bowlerName) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {ball.batsmanName && `Batsman: ${ball.batsmanName}`}
                          {ball.batsmanName && ball.bowlerName && ' • '}
                          {ball.bowlerName && `Bowler: ${ball.bowlerName}`}
                        </p>
                      )}
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
                <p>No updates yet. Match updates will appear here when the match starts.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Spectators Info */}
      <Card className="mt-6" data-testid="card-spectators-info">
        <CardHeader>
          <CardTitle className="text-lg">Match Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Overs:</span>
              <span data-testid="text-total-overs">{matchData.totalOvers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spectators:</span>
              <span data-testid="text-spectator-count">{matchData.spectatorUsernames.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match Date:</span>
              <span data-testid="text-formatted-match-date">
                {new Date(matchData.matchDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}