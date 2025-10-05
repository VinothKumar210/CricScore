import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, ArrowLeft } from 'lucide-react';
import { type LocalPlayer } from '@shared/schema';

interface MatchState {
  userTeamRole: string;
  opponentTeamRole: string;
  myTeamPlayers: LocalPlayer[];
  opponentTeamPlayers: LocalPlayer[];
  strikeBatsman: LocalPlayer;
  nonStrikeBatsman: LocalPlayer;
  currentBowler: LocalPlayer;
  currentInnings: 1 | 2;
  firstInningsComplete: boolean;
  matchOvers: number;
  firstInningsScore?: TeamScore;
  target?: number;
  matchComplete?: boolean;
  matchResult?: 'first_team_wins' | 'second_team_wins' | 'draw';
  winningTeam?: string;
}

interface BatsmanStats {
  player: LocalPlayer;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType?: DismissalType;
  bowlerName?: string;
  fielderName?: string;
}

interface BowlerStats {
  player: LocalPlayer;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
}

interface TeamScore {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
}

type DismissalType = 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | 'Hit Wicket';

export default function Scoreboard() {
  const [, setLocation] = useLocation();
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [battingTeamScore, setBattingTeamScore] = useState<TeamScore>({
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }
  });
  
  const [batsmanStats, setBatsmanStats] = useState<BatsmanStats[]>([]);
  const [bowlerStats, setBowlerStats] = useState<BowlerStats[]>([]);
  const [firstInningsBatsmanStats, setFirstInningsBatsmanStats] = useState<BatsmanStats[]>([]);
  const [firstInningsBowlerStats, setFirstInningsBowlerStats] = useState<BowlerStats[]>([]);
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showBatsmanDialog, setShowBatsmanDialog] = useState(false);
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [extrasType, setExtrasType] = useState<'nb' | 'wd' | 'lb' | null>(null);
  const [pendingWicket, setPendingWicket] = useState<DismissalType | null>(null);
  const [showRunOutDialog, setShowRunOutDialog] = useState(false);
  const [showWhoIsOutDialog, setShowWhoIsOutDialog] = useState(false);
  const [runOutRuns, setRunOutRuns] = useState<number>(0);
  const [outBatsmanIsStriker, setOutBatsmanIsStriker] = useState<boolean>(true);
  const [currentOverBalls, setCurrentOverBalls] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [showBowlerDialog, setShowBowlerDialog] = useState(false);
  const [showFielderDialog, setShowFielderDialog] = useState(false);
  const [pendingCaughtDismissal, setPendingCaughtDismissal] = useState<DismissalType | null>(null);
  
  // Auto stats posting functionality
  const [isPostingStats, setIsPostingStats] = useState(false);
  const [previousBowler, setPreviousBowler] = useState<LocalPlayer | null>(null);
  const [showInningsTransition, setShowInningsTransition] = useState(false);
  const [showMatchResult, setShowMatchResult] = useState(false);
  const [manOfTheMatchData, setManOfTheMatchData] = useState<any>(null);
  const [showTossDialog, setShowTossDialog] = useState(false);
  const [tossWinner, setTossWinner] = useState<'myTeam' | 'opponent' | null>(null);
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Helper function to parse positive integers from localStorage
    const parsePosInt = (v: string | null) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
    };
    
    // Get match data from localStorage
    const savedMatchData = localStorage.getItem('matchData');
    const savedPlayers = localStorage.getItem('selectedPlayers');
    const savedMatchOvers = localStorage.getItem('matchOvers');
    
    if (savedMatchData && savedPlayers && savedMatchOvers) {
      const matchData = JSON.parse(savedMatchData);
      const players = JSON.parse(savedPlayers);
      const matchOvers = parsePosInt(savedMatchOvers);
      
      if (!matchOvers) {
        console.error('Invalid match overs from localStorage');
        return;
      }
      
      // Check if toss has been completed
      const tossCompleted = localStorage.getItem('tossCompleted');
      
      if (!tossCompleted) {
        // Show toss dialog if not completed
        setShowTossDialog(true);
        return;
      }
      
      const initialMatchState: MatchState = {
        ...matchData,
        strikeBatsman: players.strikeBatsman,
        nonStrikeBatsman: players.nonStrikeBatsman,
        currentBowler: players.bowler,
        currentInnings: 1,
        firstInningsComplete: false,
        matchOvers: matchOvers
      };
      
      setMatchState(initialMatchState);
      
      // Initialize batsman stats
      setBatsmanStats([
        {
          player: players.strikeBatsman,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false
        },
        {
          player: players.nonStrikeBatsman,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false
        }
      ]);
      
      // Initialize bowler stats
      setBowlerStats([
        {
          player: players.bowler,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          economy: 0
        }
      ]);
    } else {
      setLocation('/match-scoring');
    }
  }, [setLocation]);

  if (!matchState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userTeamBatsFirst = matchState.userTeamRole.includes('batting');
  const battingTeamPlayers = userTeamBatsFirst 
    ? matchState.myTeamPlayers.filter(p => p.name.trim() !== '')
    : matchState.opponentTeamPlayers.filter(p => p.name.trim() !== '');

  const getCurrentBatsmanStats = (isStriker: boolean) => {
    const player = isStriker ? matchState.strikeBatsman : matchState.nonStrikeBatsman;
    return batsmanStats.find(stat => stat.player.name === player.name) || {
      player,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0
    };
  };

  const getCurrentBowlerStats = () => {
    return bowlerStats.find(stat => stat.player.name === matchState.currentBowler.name) || {
      player: matchState.currentBowler,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      economy: 0
    };
  };

  const shouldRotateStrike = (runs: number) => {
    return runs % 2 === 1; // Odd runs (1, 3, 5) rotate strike
  };

  const rotateStrike = () => {
    setMatchState(prev => prev ? {
      ...prev,
      strikeBatsman: prev.nonStrikeBatsman,
      nonStrikeBatsman: prev.strikeBatsman
    } : null);
  };

  // Auto post stats function
  const postStatsAutomatically = async () => {
    if (isPostingStats) return; // Prevent duplicate calls
    
    setIsPostingStats(true);
    
    try {
      // Collect all player performances and merge batting/bowling stats
      const playerPerformanceMap = new Map<string, {
        userId?: string;
        playerName: string;
        runsScored: number;
        ballsFaced: number;
        oversBowled: number;
        runsConceded: number;
        wicketsTaken: number;
        catchesTaken: number;
      }>();
      
      // Helper function to find player's userId from team data
      const findPlayerUserId = (playerName: string) => {
        // Check in myTeamPlayers
        const myTeamPlayer = matchState.myTeamPlayers.find(p => p.name === playerName && p.hasAccount && p.username);
        if (myTeamPlayer && myTeamPlayer.userId) {
          return myTeamPlayer.userId;
        }
        
        // Check in opponentTeamPlayers  
        const opponentPlayer = matchState.opponentTeamPlayers.find(p => p.name === playerName && p.hasAccount && p.username);
        if (opponentPlayer && opponentPlayer.userId) {
          return opponentPlayer.userId;
        }
        
        return undefined;
      };

      // Process batsman stats from both innings
      // First innings stats
      firstInningsBatsmanStats.forEach(stat => {
        const userId = findPlayerUserId(stat.player.name);
        const playerName = stat.player.name;
        
        if (playerPerformanceMap.has(playerName)) {
          const existing = playerPerformanceMap.get(playerName)!;
          existing.runsScored += stat.runs;
          existing.ballsFaced += stat.balls;
        } else {
          playerPerformanceMap.set(playerName, {
            userId: userId,
            playerName: playerName,
            runsScored: stat.runs,
            ballsFaced: stat.balls,
            oversBowled: 0,
            runsConceded: 0,
            wicketsTaken: 0,
            catchesTaken: 0
          });
        }
      });
      
      // Current innings stats (second innings if match is complete, or first innings if only first innings played)
      batsmanStats.forEach(stat => {
        const userId = findPlayerUserId(stat.player.name);
        const playerName = stat.player.name;
        
        if (playerPerformanceMap.has(playerName)) {
          const existing = playerPerformanceMap.get(playerName)!;
          existing.runsScored += stat.runs;
          existing.ballsFaced += stat.balls;
        } else {
          playerPerformanceMap.set(playerName, {
            userId: userId,
            playerName: playerName,
            runsScored: stat.runs,
            ballsFaced: stat.balls,
            oversBowled: 0,
            runsConceded: 0,
            wicketsTaken: 0,
            catchesTaken: 0
          });
        }
      });
      
      // Process bowler stats from both innings
      // First innings bowling stats
      firstInningsBowlerStats.forEach(stat => {
        const userId = findPlayerUserId(stat.player.name);
        const playerName = stat.player.name;
        
        if (playerPerformanceMap.has(playerName)) {
          const existing = playerPerformanceMap.get(playerName)!;
          existing.oversBowled += stat.overs;
          existing.runsConceded += stat.runs;
          existing.wicketsTaken += stat.wickets;
        } else {
          playerPerformanceMap.set(playerName, {
            userId: userId,
            playerName: playerName,
            runsScored: 0,
            ballsFaced: 0,
            oversBowled: stat.overs,
            runsConceded: stat.runs,
            wicketsTaken: stat.wickets,
            catchesTaken: 0
          });
        }
      });
      
      // Current innings bowling stats (second innings if match is complete, or first innings if only first innings played)
      bowlerStats.forEach(stat => {
        const userId = findPlayerUserId(stat.player.name);
        const playerName = stat.player.name;
        
        if (playerPerformanceMap.has(playerName)) {
          const existing = playerPerformanceMap.get(playerName)!;
          existing.oversBowled += stat.overs;
          existing.runsConceded += stat.runs;
          existing.wicketsTaken += stat.wickets;
        } else {
          playerPerformanceMap.set(playerName, {
            userId: userId,
            playerName: playerName,
            runsScored: 0,
            ballsFaced: 0,
            oversBowled: stat.overs,
            runsConceded: stat.runs,
            wicketsTaken: stat.wickets,
            catchesTaken: 0
          });
        }
      });

      // Calculate catches taken by fielders from caught dismissals in both innings
      // First innings catches
      firstInningsBatsmanStats.forEach(stat => {
        if (stat.dismissalType === 'Caught' && stat.fielderName) {
          const fielderName = stat.fielderName;
          
          if (playerPerformanceMap.has(fielderName)) {
            const existing = playerPerformanceMap.get(fielderName)!;
            existing.catchesTaken += 1;
          } else {
            const userId = findPlayerUserId(fielderName);
            playerPerformanceMap.set(fielderName, {
              userId: userId,
              playerName: fielderName,
              runsScored: 0,
              ballsFaced: 0,
              oversBowled: 0,
              runsConceded: 0,
              wicketsTaken: 0,
              catchesTaken: 1
            });
          }
        }
      });
      
      // Current innings catches
      batsmanStats.forEach(stat => {
        if (stat.dismissalType === 'Caught' && stat.fielderName) {
          const fielderName = stat.fielderName;
          
          if (playerPerformanceMap.has(fielderName)) {
            const existing = playerPerformanceMap.get(fielderName)!;
            existing.catchesTaken += 1;
          } else {
            const userId = findPlayerUserId(fielderName);
            playerPerformanceMap.set(fielderName, {
              userId: userId,
              playerName: fielderName,
              runsScored: 0,
              ballsFaced: 0,
              oversBowled: 0,
              runsConceded: 0,
              wicketsTaken: 0,
              catchesTaken: 1
            });
          }
        }
      });

      // Ensure all players who participated are included (even if they only fielded)
      const allParticipatingPlayers = [...matchState.myTeamPlayers, ...matchState.opponentTeamPlayers]
        .filter(p => p.name.trim() !== ''); // Only include players with names
      
      allParticipatingPlayers.forEach(player => {
        const userId = findPlayerUserId(player.name);
        const playerName = player.name;
        
        // If player not already in map (didn't bat, bowl, or field), add them with zero stats
        if (!playerPerformanceMap.has(playerName)) {
          playerPerformanceMap.set(playerName, {
            userId: userId,
            playerName: playerName,
            runsScored: 0,
            ballsFaced: 0,
            oversBowled: 0,
            runsConceded: 0,
            wicketsTaken: 0,
            catchesTaken: 0
          });
        }
      });

      // Convert map to array
      const allPlayerPerformances = Array.from(playerPerformanceMap.values());

      console.log('Auto-posting player performances to backend:', allPlayerPerformances);
      
      // Send to backend
      const response = await fetch('/api/local-match-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          matchName: 'Local Match',
          venue: 'Local Ground',
          matchDate: new Date().toISOString(),
          myTeamPlayers: matchState.myTeamPlayers,
          opponentTeamPlayers: matchState.opponentTeamPlayers,
          finalScore: {
            runs: battingTeamScore.runs,
            wickets: battingTeamScore.wickets,
            overs: battingTeamScore.overs + (battingTeamScore.balls / 6)
          },
          playerPerformances: allPlayerPerformances
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store man of the match data with detailed stats
        if (result.manOfTheMatch) {
          // Find the player's detailed performance stats
          const manOfTheMatchPlayer = allPlayerPerformances.find(
            p => p.playerName === result.manOfTheMatch.playerName
          );
          
          // Find the player's username and account info
          const findPlayerInfo = (playerName: string) => {
            const myTeamPlayer = matchState.myTeamPlayers.find(p => p.name === playerName);
            const opponentPlayer = matchState.opponentTeamPlayers.find(p => p.name === playerName);
            return myTeamPlayer || opponentPlayer || { name: playerName, hasAccount: false, username: '' };
          };
          
          const playerInfo = findPlayerInfo(result.manOfTheMatch.playerName);
          
          // Enhanced man of the match data with detailed stats
          const enhancedManOfTheMatchData = {
            ...result.manOfTheMatch,
            detailedStats: manOfTheMatchPlayer,
            username: playerInfo.username || '',
            hasAccount: playerInfo.hasAccount || false
          };
          
          setManOfTheMatchData(enhancedManOfTheMatchData);
        }
        
        // Invalidate stats and matches cache to ensure fresh data is loaded
        if (typeof window !== 'undefined' && window.location) {
          // Clear any cached user stats so they're refetched when user visits stats page
          queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
          queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
        }
        
        toast({
          title: "Stats Updated Successfully!",
          description: `Career statistics updated for ${result.playersWithAccounts || 0} players with accounts.`,
        });
        
        console.log('Stats update results:', result);
      } else {
        const errorText = await response.text();
        console.error('Failed to post stats automatically:', errorText);
        toast({
          title: "Stats Update Failed",
          description: "There was an issue updating player statistics. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error posting stats:', error);
    } finally {
      setIsPostingStats(false);
    }
  };

  // Helper function to format cricket overs correctly
  const formatCricketOvers = (oversValue: number): string => {
    if (oversValue === 0) return '0.0';
    
    // Extract overs and balls from the stored value
    const oversStr = oversValue.toString();
    const [overs, balls] = oversStr.split('.');
    
    // Ensure balls is always a single digit 0-5
    const ballsNum = parseInt(balls || '0');
    const validBalls = Math.min(ballsNum, 5); // Cricket balls should never exceed 5
    
    return `${overs}.${validBalls}`;
  };

  const updateBatsmanStats = (player: LocalPlayer, runsScored: number, ballFaced: boolean = true) => {
    setBatsmanStats(prev => prev.map(stat => {
      if (stat.player.name === player.name) {
        const newRuns = stat.runs + runsScored;
        const newBalls = stat.balls + (ballFaced ? 1 : 0);
        const newFours = stat.fours + (runsScored === 4 ? 1 : 0);
        const newSixes = stat.sixes + (runsScored === 6 ? 1 : 0);
        const newStrikeRate = newBalls > 0 ? (newRuns / newBalls) * 100 : 0;
        
        return {
          ...stat,
          runs: newRuns,
          balls: newBalls,
          fours: newFours,
          sixes: newSixes,
          strikeRate: Math.round(newStrikeRate * 100) / 100
        };
      }
      return stat;
    }));
  };

  const updateBowlerStats = (runsGiven: number, isLegalBall: boolean = true, isWicket: boolean = false) => {
    setBowlerStats(prev => prev.map(stat => {
      if (stat.player.name === matchState.currentBowler.name) {
        const newRuns = stat.runs + runsGiven;
        const newBalls = stat.balls + (isLegalBall ? 1 : 0);
        const newWickets = stat.wickets + (isWicket ? 1 : 0);
        const newOvers = Math.floor(newBalls / 6);
        const remainingBalls = newBalls % 6;
        const oversBowled = parseFloat(newOvers + '.' + remainingBalls);
        // For economy calculation, convert back to decimal overs (e.g., 1.2 overs = 1.33 decimal overs)
        const decimalOvers = newOvers + (remainingBalls / 6);
        const newEconomy = decimalOvers > 0 ? newRuns / decimalOvers : 0;
        
        return {
          ...stat,
          runs: newRuns,
          balls: newBalls,
          overs: oversBowled,
          wickets: newWickets,
          economy: Math.round(newEconomy * 100) / 100
        };
      }
      return stat;
    }));
  };

  const updateTeamScore = (runsToAdd: number, isLegalBall: boolean = true) => {
    setBattingTeamScore(prev => {
      const newRuns = prev.runs + runsToAdd;
      const newBalls = prev.balls + (isLegalBall ? 1 : 0);
      const newOvers = Math.floor(newBalls / 6);
      const remainingBalls = newBalls % 6;
      
      const updatedScore = {
        ...prev,
        runs: newRuns,
        balls: newBalls,
        overs: newOvers
      };
      
      // Check for first innings completion
      if (matchState && !matchState.firstInningsComplete && newBalls >= matchState.matchOvers * 6) {
        // Calculate the updated bowler stats that would include this final ball
        const updatedBowlerStats = bowlerStats.map(stat => {
          if (stat.player.name === matchState.currentBowler.name) {
            const newBowlerBalls = stat.balls + 1;
            const newBowlerRuns = stat.runs + runsToAdd;
            const newOvers = Math.floor(newBowlerBalls / 6);
            const remainingBalls = newBowlerBalls % 6;
            const oversBowled = parseFloat(newOvers + '.' + remainingBalls);
            const decimalOvers = newOvers + (remainingBalls / 6);
            const newEconomy = decimalOvers > 0 ? newBowlerRuns / decimalOvers : 0;
            
            return {
              ...stat,
              runs: newBowlerRuns,
              balls: newBowlerBalls,
              overs: oversBowled,
              economy: Math.round(newEconomy * 100) / 100
            };
          }
          return stat;
        });
        
        handleInningsComplete(updatedScore, batsmanStats, updatedBowlerStats);
      }
      
      // Check for second innings/match completion
      if (matchState && matchState.currentInnings === 2 && !matchState.matchComplete) {
        setTimeout(() => checkMatchCompletion(updatedScore), 100);
      }
      
      return updatedScore;
    });
  };
  
  const checkMatchCompletion = (currentScore: TeamScore) => {
    if (!matchState || !matchState.target || matchState.matchComplete) return;
    
    const targetReached = currentScore.runs >= matchState.target;
    const oversCompleted = currentScore.overs >= matchState.matchOvers;
    const allWicketsLost = currentScore.wickets >= 10; // Assuming 11 players, so 10 wickets
    
    let matchComplete = false;
    let result: 'first_team_wins' | 'second_team_wins' | 'draw' | undefined;
    let winningTeam: string | undefined;
    
    if (targetReached) {
      // Target reached - second batting team wins
      matchComplete = true;
      result = 'second_team_wins';
      winningTeam = matchState.userTeamRole.includes('batting') ? 'Your Team' : 'Opponent Team';
    } else if (oversCompleted || allWicketsLost) {
      // Overs completed or all wickets lost - compare scores
      matchComplete = true;
      if (currentScore.runs < matchState.target - 1) {
        // Second team didn't reach target
        result = 'first_team_wins';
        winningTeam = matchState.userTeamRole.includes('bowling') ? 'Your Team' : 'Opponent Team';
      } else if (currentScore.runs === matchState.target - 1) {
        // Scores are equal
        result = 'draw';
      }
    }
    
    if (matchComplete) {
      setMatchState(prev => prev ? {
        ...prev,
        matchComplete: true,
        matchResult: result,
        winningTeam: winningTeam
      } : null);
      
      // Automatically post stats when match completes
      setTimeout(async () => {
        await postStatsAutomatically();
        setShowMatchResult(true);
      }, 500);
    }
  };
  
  const handleInningsComplete = (finalScore: TeamScore, currentBatsmanStats?: BatsmanStats[], currentBowlerStats?: BowlerStats[]) => {
    if (!matchState) return;
    
    if (matchState.currentInnings === 1) {
      // First innings complete - store the score and capture stats
      const target = finalScore.runs + 1;
      
      // Use provided stats or fall back to current state
      const statsToCapture = currentBatsmanStats || batsmanStats;
      const bowlerStatsToCapture = currentBowlerStats || bowlerStats;
      
      // Capture first innings batting and bowling statistics
      setFirstInningsBatsmanStats([...statsToCapture]);
      setFirstInningsBowlerStats([...bowlerStatsToCapture]);
      
      // Only update the first innings completion, don't start second innings yet
      setMatchState(prev => prev ? {
        ...prev,
        firstInningsComplete: true,
        firstInningsScore: finalScore,
        target: target
      } : null);
      
      // Show innings transition dialog - user must choose to start second innings
      setShowInningsTransition(true);
    }
  };
  
  const startSecondInnings = () => {
    if (!matchState) return;
    
    // Now actually transition to second innings
    setMatchState(prev => prev ? {
      ...prev,
      currentInnings: 2,
      // Switch teams
      userTeamRole: prev.userTeamRole.includes('batting') ? prev.userTeamRole.replace('batting', 'bowling') : prev.userTeamRole.replace('bowling', 'batting'),
      opponentTeamRole: prev.opponentTeamRole.includes('batting') ? prev.opponentTeamRole.replace('batting', 'bowling') : prev.opponentTeamRole.replace('bowling', 'batting'),
      // Clear batsmen and bowler from first innings to start fresh for second innings
      strikeBatsman: { name: '', hasAccount: false, username: '' },
      nonStrikeBatsman: { name: '', hasAccount: false, username: '' },
      currentBowler: { name: '', hasAccount: false, username: '' }
    } : null);
    
    // Reset score for second innings
    setBattingTeamScore({
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }
    });
    
    // Reset batsman stats for second innings (but preserve first innings stats separately)
    setBatsmanStats([]);
    
    // Reset bowler stats for second innings (but preserve first innings stats separately)  
    setBowlerStats([]);
    
    // Reset current over display
    setCurrentOverBalls([]);
    
    // Close the transition dialog
    setShowInningsTransition(false);
    
    // Start selecting players for second innings
    setShowBatsmanDialog(true);
  };

  const saveStateForUndo = () => {
    const currentState = {
      battingTeamScore: { ...battingTeamScore },
      batsmanStats: [...batsmanStats],
      bowlerStats: [...bowlerStats],
      matchState: { ...matchState },
      currentOverBalls: [...currentOverBalls],
      actionType: 'run'
    };
    setUndoStack(prev => [...prev, currentState]);
  };

  const handleRunScored = (runs: number) => {
    // Prevent scoring if match is complete
    if (matchState?.matchComplete) return;
    
    // Save current state for undo
    saveStateForUndo();
    
    // Add to current over display
    setCurrentOverBalls(prev => [...prev, runs.toString()]);
    
    // Update striker's stats
    updateBatsmanStats(matchState.strikeBatsman, runs);
    
    // Update bowler stats BEFORE team score to ensure final ball is counted
    updateBowlerStats(runs);
    
    // Update team score (this may trigger innings completion)
    updateTeamScore(runs);
    
    // Rotate strike if needed
    if (shouldRotateStrike(runs)) {
      rotateStrike();
    }
    
    // Check for end of over
    if ((battingTeamScore.balls + 1) % 6 === 0) {
      // Only show bowler selection dialog if innings is not complete
      const newOvers = Math.floor((battingTeamScore.balls + 1) / 6);
      if (matchState && newOvers < matchState.matchOvers) {
        // End of over but innings continues - show bowler selection dialog
        setTimeout(() => {
          setShowBowlerDialog(true);
        }, 500);
      }
      // If newBalls >= matchState.matchOvers * 6, innings is complete and handleInningsComplete will handle it
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const lastState = undoStack[undoStack.length - 1];
    
    // Restore all states
    setBattingTeamScore(lastState.battingTeamScore);
    setBatsmanStats(lastState.batsmanStats);
    setBowlerStats(lastState.bowlerStats);
    setMatchState(lastState.matchState);
    setCurrentOverBalls(lastState.currentOverBalls);
    
    // Remove the last state from undo stack
    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleExtra = (type: 'nb' | 'wd' | 'lb', additionalRuns: number = 0, isLegBye: boolean = false) => {
    // Prevent extras if match is complete
    if (matchState?.matchComplete) return;
    
    if (type === 'nb' && isLegBye) {
      // Add to current over display
      setCurrentOverBalls(prev => [...prev, `NB+LB${additionalRuns}`]);
      
      // No Ball + Leg Bye: 1 run penalty + leg bye runs, no legal ball
      const totalRuns = 1 + additionalRuns; // 1 for no ball + leg bye runs
      updateTeamScore(totalRuns, false); // Not a legal ball
      updateBatsmanStats(matchState.strikeBatsman, 0, false); // No runs to batsman, no ball faced
      updateBowlerStats(totalRuns, false, false); // Runs given, no legal ball
      
      // Update extras
      setBattingTeamScore(prev => ({
        ...prev,
        extras: {
          ...prev.extras,
          noBalls: prev.extras.noBalls + 1,
          legByes: prev.extras.legByes + additionalRuns
        }
      }));
      
      // Rotate strike for odd leg bye runs
      if (shouldRotateStrike(additionalRuns)) {
        rotateStrike();
      }
    } else if (type === 'lb') {
      // Add to current over display
      setCurrentOverBalls(prev => [...prev, `LB${additionalRuns}`]);
      
      // Leg bye: runs go to team only, striker faces ball, legal delivery
      updateTeamScore(additionalRuns, true); // Legal ball
      updateBatsmanStats(matchState.strikeBatsman, 0, true); // No runs to batsman, but ball faced
      updateBowlerStats(additionalRuns, true, false); // Runs given, legal ball, no wicket
      
      // Update leg byes in extras
      setBattingTeamScore(prev => ({
        ...prev,
        extras: {
          ...prev.extras,
          legByes: prev.extras.legByes + additionalRuns
        }
      }));
      
      // Rotate strike for odd runs
      if (shouldRotateStrike(additionalRuns)) {
        rotateStrike();
      }
      
      // Check for end of over
      if ((battingTeamScore.balls + 1) % 6 === 0) {
        // Only show bowler selection dialog if innings is not complete
        const newOvers = Math.floor((battingTeamScore.balls + 1) / 6);
        if (matchState && newOvers < matchState.matchOvers) {
          // End of over but innings continues - show bowler selection dialog
          setTimeout(() => {
            setShowBowlerDialog(true);
          }, 500);
        }
        // If newBalls >= matchState.matchOvers * 6, innings is complete and handleInningsComplete will handle it
      }
    } else {
      // Add to current over display
      if (type === 'nb') {
        setCurrentOverBalls(prev => [...prev, additionalRuns > 0 ? `NB+${additionalRuns}` : 'NB']);
      } else if (type === 'wd') {
        setCurrentOverBalls(prev => [...prev, additionalRuns > 0 ? `WD+${additionalRuns}` : 'WD']);
      }
      
      const totalRuns = 1 + additionalRuns; // 1 for the extra + additional runs
      
      // Update team score (no legal ball)
      updateTeamScore(totalRuns, false);
      
      // Update extras
      setBattingTeamScore(prev => ({
        ...prev,
        extras: {
          ...prev.extras,
          noBalls: prev.extras.noBalls + (type === 'nb' ? 1 : 0),
          wides: prev.extras.wides + (type === 'wd' ? 1 : 0)
        }
      }));
      
      // For no ball, update striker's stats
      if (type === 'nb') {
        if (additionalRuns > 0) {
          // When batter scores runs on no-ball, they hit the ball so it counts as ball faced
          updateBatsmanStats(matchState.strikeBatsman, additionalRuns, true);
          
          // Rotate strike for odd additional runs
          if (shouldRotateStrike(additionalRuns)) {
            rotateStrike();
          }
        } else {
          // Even if no runs scored, no-ball counts as ball faced (ball delivered to batter)
          updateBatsmanStats(matchState.strikeBatsman, 0, true);
        }
      }
      
      // For wide with runs, do NOT update batsman stats, but still handle strike rotation
      if (type === 'wd' && additionalRuns > 0) {
        // Rotate strike for odd additional runs (but no runs to batsman)
        if (shouldRotateStrike(additionalRuns)) {
          rotateStrike();
        }
      }
      
      // Update bowler stats (runs but no legal ball)
      updateBowlerStats(totalRuns, false);
    }
  };

  const handleWicket = (dismissalType: DismissalType) => {
    // Prevent wickets if match is complete
    if (matchState?.matchComplete) return;
    
    if (dismissalType === 'Run Out') {
      // For run outs, show run options first
      setShowRunOutDialog(true);
      return;
    }
    
    if (dismissalType === 'Caught') {
      // For caught dismissals, show fielder selection first
      setPendingCaughtDismissal(dismissalType);
      setShowFielderDialog(true);
      return;
    }
    
    // For other dismissals (Bowled, LBW, Stumped, Hit Wicket, etc.)
    // Add to current over display
    setCurrentOverBalls(prev => [...prev, 'W']);
    
    // Update bowler stats BEFORE team score to ensure wicket ball is counted
    if (['Bowled', 'Caught', 'LBW', 'Hit Wicket'].includes(dismissalType)) {
      updateBowlerStats(0, true, true);
    } else {
      updateBowlerStats(0, true, false);
    }
    
    // Update striker's balls faced
    updateBatsmanStats(matchState.strikeBatsman, 0);
    
    // Update team wickets and balls (wicket counts as a legal delivery)
    setBattingTeamScore(prev => {
      const newBalls = prev.balls + 1;  // Wicket counts as 1 ball
      const newOvers = Math.floor(newBalls / 6);
      
      const updatedScore = {
        ...prev,
        wickets: prev.wickets + 1,
        balls: newBalls,
        overs: newOvers
      };
      
      // Check for first innings completion
      if (matchState && !matchState.firstInningsComplete && (newBalls >= matchState.matchOvers * 6 || updatedScore.wickets >= 10)) {
        setTimeout(() => {
          // For wicket balls, calculate updated bowler stats manually
          const updatedBowlerStats = bowlerStats.map(stat => {
            if (stat.player.name === matchState.currentBowler.name) {
              const newBowlerBalls = stat.balls + 1;
              const newBowlerWickets = stat.wickets + 1; // Wicket ball
              const newOvers = Math.floor(newBowlerBalls / 6);
              const remainingBalls = newBowlerBalls % 6;
              const oversBowled = parseFloat(newOvers + '.' + remainingBalls);
              const decimalOvers = newOvers + (remainingBalls / 6);
              const newEconomy = decimalOvers > 0 ? stat.runs / decimalOvers : 0;
              
              return {
                ...stat,
                balls: newBowlerBalls,
                wickets: newBowlerWickets,
                overs: oversBowled,
                economy: Math.round(newEconomy * 100) / 100
              };
            }
            return stat;
          });
          
          handleInningsComplete(updatedScore, batsmanStats, updatedBowlerStats);
        }, 100);
      }
      
      // Check for match completion in second innings after wicket
      if (matchState && matchState.currentInnings === 2 && !matchState.matchComplete) {
        setTimeout(() => checkMatchCompletion(updatedScore), 100);
      }
      
      return updatedScore;
    });
    
    // Mark striker as out with dismissal details
    setBatsmanStats(prev => prev.map(stat => {
      if (stat.player.name === matchState.strikeBatsman.name) {
        return {
          ...stat,
          isOut: true,
          dismissalType: dismissalType,
          bowlerName: ['Bowled', 'Caught', 'LBW', 'Hit Wicket'].includes(dismissalType) 
            ? matchState.currentBowler.name 
            : undefined
        };
      }
      return stat;
    }));
    
    // Show dialog to select new batsman
    setShowBatsmanDialog(true);
    setPendingWicket(dismissalType);
  };

  const handleFielderSelection = (fielder: LocalPlayer) => {
    if (!pendingCaughtDismissal) return;
    
    // Add to current over display
    setCurrentOverBalls(prev => [...prev, 'W']);
    
    // Update bowler stats BEFORE team score to ensure wicket ball is counted
    updateBowlerStats(0, true, true);
    
    // Update striker's balls faced
    updateBatsmanStats(matchState.strikeBatsman, 0);
    
    // Update team wickets and balls (wicket counts as a legal delivery)
    setBattingTeamScore(prev => {
      const newBalls = prev.balls + 1;  // Wicket counts as 1 ball
      const newOvers = Math.floor(newBalls / 6);
      
      const updatedScore = {
        ...prev,
        wickets: prev.wickets + 1,
        balls: newBalls,
        overs: newOvers
      };
      
      // Check for first innings completion
      if (matchState && !matchState.firstInningsComplete && (newBalls >= matchState.matchOvers * 6 || updatedScore.wickets >= 10)) {
        setTimeout(() => {
          // For wicket balls, calculate updated bowler stats manually
          const updatedBowlerStats = bowlerStats.map(stat => {
            if (stat.player.name === matchState.currentBowler.name) {
              const newBowlerBalls = stat.balls + 1;
              const newBowlerWickets = stat.wickets + 1; // Wicket ball
              const newOvers = Math.floor(newBowlerBalls / 6);
              const remainingBalls = newBowlerBalls % 6;
              const oversBowled = parseFloat(newOvers + '.' + remainingBalls);
              const decimalOvers = newOvers + (remainingBalls / 6);
              const newEconomy = decimalOvers > 0 ? stat.runs / decimalOvers : 0;
              
              return {
                ...stat,
                balls: newBowlerBalls,
                wickets: newBowlerWickets,
                overs: oversBowled,
                economy: Math.round(newEconomy * 100) / 100
              };
            }
            return stat;
          });
          
          handleInningsComplete(updatedScore, batsmanStats, updatedBowlerStats);
        }, 100);
      }
      
      // Check for match completion in second innings after wicket
      if (matchState && matchState.currentInnings === 2 && !matchState.matchComplete) {
        setTimeout(() => checkMatchCompletion(updatedScore), 100);
      }
      
      return updatedScore;
    });
    
    // Mark striker as out with dismissal details including fielder
    setBatsmanStats(prev => prev.map(stat => {
      if (stat.player.name === matchState.strikeBatsman.name) {
        return {
          ...stat,
          isOut: true,
          dismissalType: pendingCaughtDismissal,
          bowlerName: matchState.currentBowler.name,
          fielderName: fielder.name
        };
      }
      return stat;
    }));
    
    // Clean up and show new batsman dialog
    setShowFielderDialog(false);
    setPendingCaughtDismissal(null);
    setShowBatsmanDialog(true);
    setPendingWicket(pendingCaughtDismissal);
  };

  const handleRunOut = (runs: number) => {
    setRunOutRuns(runs);
    
    // Don't update scores yet - wait until user selects who is out
    // Just store the runs and proceed to who is out dialog
    
    setShowRunOutDialog(false);
    setShowWhoIsOutDialog(true);
  };

  const handleWhoIsOut = (isStriker: boolean) => {
    // NOW update scores - only after user selects who is out
    
    // Always add runs to team score (even for +0)
    updateTeamScore(runOutRuns);
    
    // Always add runs to striker (A) and count ball faced - striker always faces the ball
    updateBatsmanStats(matchState.strikeBatsman, runOutRuns);
    
    // Update bowler stats 
    updateBowlerStats(runOutRuns);
    
    // Add to current over display
    setCurrentOverBalls(prev => [...prev, runOutRuns === 0 ? 'RO' : `RO+${runOutRuns}`]);
    
    // Update team wickets
    setBattingTeamScore(prev => {
      const updatedScore = {
        ...prev,
        wickets: prev.wickets + 1
      };
      
      // Check for first innings completion
      if (matchState && !matchState.firstInningsComplete && updatedScore.wickets >= 10) {
        setTimeout(() => {
          // For wicket balls, calculate updated bowler stats manually
          const updatedBowlerStats = bowlerStats.map(stat => {
            if (stat.player.name === matchState.currentBowler.name) {
              const newBowlerBalls = stat.balls + 1;
              const newBowlerWickets = stat.wickets + 1; // Wicket ball
              const newOvers = Math.floor(newBowlerBalls / 6);
              const remainingBalls = newBowlerBalls % 6;
              const oversBowled = parseFloat(newOvers + '.' + remainingBalls);
              const decimalOvers = newOvers + (remainingBalls / 6);
              const newEconomy = decimalOvers > 0 ? stat.runs / decimalOvers : 0;
              
              return {
                ...stat,
                balls: newBowlerBalls,
                wickets: newBowlerWickets,
                overs: oversBowled,
                economy: Math.round(newEconomy * 100) / 100
              };
            }
            return stat;
          });
          
          handleInningsComplete(updatedScore, batsmanStats, updatedBowlerStats);
        }, 100);
      }
      
      // Check for match completion in second innings after wicket
      if (matchState && matchState.currentInnings === 2 && !matchState.matchComplete) {
        setTimeout(() => checkMatchCompletion(updatedScore), 100);
      }
      
      return updatedScore;
    });
    
    // Mark the out batsman with run out details
    const outBatsmanName = isStriker ? matchState.strikeBatsman.name : matchState.nonStrikeBatsman.name;
    setBatsmanStats(prev => prev.map(stat => {
      if (stat.player.name === outBatsmanName) {
        return {
          ...stat,
          isOut: true,
          dismissalType: 'Run Out' as DismissalType,
          bowlerName: undefined // Run outs don't credit the bowler
        };
      }
      return stat;
    }));
    
    // Track which batsman is out for replacement (don't rotate yet)
    setOutBatsmanIsStriker(isStriker);
    setPendingWicket('Run Out');
    
    setShowWhoIsOutDialog(false);
    setShowBatsmanDialog(true);
  };

  const selectNewBowler = (newBowler: LocalPlayer) => {
    // Check if bowler already exists in stats, if not add them
    setBowlerStats(prev => {
      const existingBowler = prev.find(stat => stat.player.name === newBowler.name);
      if (existingBowler) {
        // Bowler already exists, just return existing stats
        return prev;
      } else {
        // New bowler, add to stats
        return [
          ...prev,
          {
            player: newBowler,
            overs: 0,
            balls: 0,
            runs: 0,
            wickets: 0,
            economy: 0
          }
        ];
      }
    });
    
    // Store the current bowler as previous before changing
    if (matchState?.currentBowler) {
      setPreviousBowler(matchState.currentBowler);
    }
    
    // Update match state with new bowler
    setMatchState(prev => prev ? {
      ...prev,
      currentBowler: newBowler
    } : null);
    
    // Rotate strike and reset over
    rotateStrike();
    setCurrentOverBalls([]);
    
    setShowBowlerDialog(false);
  };

  const selectNewBatsman = (newBatsman: LocalPlayer) => {
    // For second innings, we need to select both openers if current batsmen are not set yet
    if (matchState?.currentInnings === 2 && !matchState.strikeBatsman.name) {
      // This is the first batsman for second innings - set as striker
      setBatsmanStats(prev => [
        ...prev,
        {
          player: newBatsman,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false
        }
      ]);
      
      setMatchState(prev => prev ? {
        ...prev,
        strikeBatsman: newBatsman
      } : null);
      
      // Need to select second batsman (non-striker)
      return;
    }
    
    if (matchState?.currentInnings === 2 && matchState.strikeBatsman.name && !matchState.nonStrikeBatsman.name) {
      // This is the second batsman for second innings - set as non-striker
      setBatsmanStats(prev => [
        ...prev,
        {
          player: newBatsman,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false
        }
      ]);
      
      setMatchState(prev => prev ? {
        ...prev,
        nonStrikeBatsman: newBatsman
      } : null);
      
      setShowBatsmanDialog(false);
      // Now need to select opening bowler for second innings
      setShowBowlerDialog(true);
      return;
    }
    
    // Regular batsman replacement logic (existing code)
    setBatsmanStats(prev => [
      ...prev,
      {
        player: newBatsman,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false
      }
    ]);
    
    // For Run Out: determine replacement position based on where the out batsman was running to
    if (pendingWicket === 'Run Out') {
      if (outBatsmanIsStriker) {
        // Striker is out - replace striker
        setMatchState(prev => prev ? {
          ...prev,
          strikeBatsman: newBatsman
        } : null);
      } else {
        // Non-striker is out
        if (runOutRuns % 2 === 0) {
          // Even runs (2,4,6): after completed runs, players back to original positions
          // Non-striker was running toward striker end, so:
          // - New player takes striker position (where B was heading)
          // - A (original striker) moves to non-striker position
          setMatchState(prev => prev ? {
            ...prev,
            strikeBatsman: newBatsman,
            nonStrikeBatsman: prev.strikeBatsman  // A moves to non-striker
          } : null);
        } else {
          // Odd runs (1,3,5): after completed runs, players swapped positions
          // Non-striker was running toward non-striker end, so:
          // - New player takes non-striker position (where B was heading)
          // - A stays at striker position
          setMatchState(prev => prev ? {
            ...prev,
            nonStrikeBatsman: newBatsman
          } : null);
        }
      }
    } else {
      // For other dismissals, replace striker (who got out)
      // The new batsman simply takes the striker position
      // The non-striker stays in their position
      setMatchState(prev => prev ? {
        ...prev,
        strikeBatsman: newBatsman
      } : null);
    }
    
    setShowBatsmanDialog(false);
    setPendingWicket(null);
  };

  const availableBatsmen = battingTeamPlayers
    .filter(player => player.name && player.name.trim() !== '')
    .filter(player => !batsmanStats.some(stat => stat.player.name === player.name));
  
  const bowlingTeamPlayers = (userTeamBatsFirst ? matchState.opponentTeamPlayers : matchState.myTeamPlayers)
    .filter(player => player.name && player.name.trim() !== '');
  
  // Store the previous bowler to prevent consecutive overs

  // Simple bowling selection - only exclude current bowler and previous bowler
  let availableBowlers = bowlingTeamPlayers.filter((player: LocalPlayer) => {
    // Exclude current bowler (cannot bowl consecutive balls)
    if (player.name === matchState?.currentBowler.name) return false;
    
    // Exclude previous bowler to prevent consecutive overs (unless it's the first over)
    if (previousBowler && player.name === previousBowler.name && battingTeamScore.balls > 0) return false;
    
    return true;
  });
  
  // Fallback: If no bowlers available and we have a previous bowler constraint, relax it
  if (availableBowlers.length === 0 && previousBowler && battingTeamScore.balls > 0) {
    availableBowlers = bowlingTeamPlayers.filter((player: LocalPlayer) => {
      // Only exclude current bowler, allow previous bowler as fallback
      if (player.name === matchState?.currentBowler.name) return false;
      
      return true;
    });
  }

  const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex justify-start mb-4">
        <Button 
          onClick={() => setLocation('/local-match')}
          variant="ghost"
          size="sm"
          data-testid="button-back-to-create-match"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Create Match
        </Button>
      </div>
      
      {/* Match Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {userTeamBatsFirst ? 'Your Team' : 'Opponent Team'} Batting
            <Badge className="ml-2" variant={matchState.currentInnings === 1 ? "default" : "secondary"}>
              {matchState.currentInnings === 1 ? '1st Innings' : '2nd Innings'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {battingTeamScore.runs}/{battingTeamScore.wickets}
            </div>
            <div className="text-lg text-muted-foreground mb-2">
              Overs: {formatOvers(battingTeamScore.balls)}/{matchState.matchOvers}
            </div>
            
            {/* Target and Required Run Rate for 2nd Innings */}
            {matchState.currentInnings === 2 && matchState.target && (
              <div className="mt-4 p-3 bg-sky-50 dark:bg-slate-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">Target: {matchState.target}</div>
                    <div className="text-muted-foreground">To Win</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {matchState.target - battingTeamScore.runs}
                    </div>
                    <div className="text-muted-foreground">Runs Needed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {(() => {
                        const ballsRemaining = (matchState.matchOvers * 6) - battingTeamScore.balls;
                        const oversRemaining = ballsRemaining / 6;
                        const runsNeeded = matchState.target - battingTeamScore.runs;
                        return oversRemaining > 0 ? (runsNeeded / oversRemaining).toFixed(2) : '0.00';
                      })()} RPO
                    </div>
                    <div className="text-muted-foreground">Required Rate</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* First Innings Summary for 2nd Innings */}
            {matchState.currentInnings === 2 && matchState.firstInningsScore && (
              <div className="mt-2 text-sm text-muted-foreground">
                First innings: {matchState.firstInningsScore.runs}/{matchState.firstInningsScore.wickets} ({formatOvers(matchState.firstInningsScore.balls)} ov)
              </div>
            )}
            
            {/* Current Batsmen and Bowler at bottom */}
            <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              {/* Current Batsmen - Bottom Left */}
              <div className="text-left">
                <div className="text-xs text-muted-foreground mb-1">Current Batsmen</div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {matchState.strikeBatsman.name}* {getCurrentBatsmanStats(true).runs}({getCurrentBatsmanStats(true).balls})
                  </div>
                  <div className="text-sm">
                    {matchState.nonStrikeBatsman.name} {getCurrentBatsmanStats(false).runs}({getCurrentBatsmanStats(false).balls})
                  </div>
                </div>
              </div>
              
              {/* Current Bowler - Bottom Right */}
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Current Bowler</div>
                <div className="text-sm font-medium">
                  {matchState.currentBowler.name} {getCurrentBowlerStats().wickets}-{getCurrentBowlerStats().runs}, {getCurrentBowlerStats().overs}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Over Display */}
      <div className="bg-sky-50 dark:bg-slate-800 rounded-lg border p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Current Over</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Over {battingTeamScore.overs + 1} of {matchState.matchOvers} ({matchState.currentInnings === 1 ? '1st' : '2nd'} Innings)
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Balls:</span>
          <div className="flex space-x-1">
            {currentOverBalls.map((ball, index) => (
              <div
                key={index}
                className="min-w-[40px] h-8 bg-white dark:bg-slate-700 border rounded flex items-center justify-center text-sm font-medium"
                data-testid={`ball-${index}`}
              >
                {ball}
              </div>
            ))}
            {/* Empty slots for remaining balls */}
            {Array.from({ length: 6 - currentOverBalls.length }, (_, index) => (
              <div
                key={`empty-${index}`}
                className="min-w-[40px] h-8 bg-gray-100 dark:bg-slate-600 border border-dashed rounded flex items-center justify-center text-sm text-gray-400"
              >
                -
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scoring Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Ball-by-Ball Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h4 className="font-semibold mb-2">Scoring Controls</h4>
          
          {/* 3 rows x 2 columns layout */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Row 1: Run buttons 0,1,2 and 3,4,6 */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map(runs => (
                  <Button
                    key={runs}
                    onClick={() => handleRunScored(runs)}
                    variant={runs === 4 || runs === 6 ? "default" : "outline"}
                    className="h-12 text-lg font-bold"
                    data-testid={`button-runs-${runs}`}
                  >
                    {runs}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {[3, 4, 6].map(runs => (
                  <Button
                    key={runs}
                    onClick={() => handleRunScored(runs)}
                    variant={runs === 4 || runs === 6 ? "default" : "outline"}
                    className="h-12 text-lg font-bold"
                    data-testid={`button-runs-${runs}`}
                  >
                    {runs}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Row 2: Wicket and Undo */}
            <Button
              onClick={() => {
                saveStateForUndo();
                setShowWicketDialog(true);
              }}
              variant="destructive"
              className="h-12"
              data-testid="button-wicket"
            >
              Wicket
            </Button>
            
            <Button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              variant="secondary"
              className="h-12"
              data-testid="button-undo"
            >
              Undo
            </Button>
            
            {/* Row 3: Extras - No Ball and Wide */}
            <Button
              onClick={() => {
                saveStateForUndo();
                setExtrasType('nb');
                setShowExtrasDialog(true);
              }}
              variant="secondary"
              className="h-12"
              data-testid="button-no-ball"
            >
              No Ball (NB)
            </Button>
            
            <Button
              onClick={() => {
                saveStateForUndo();
                setExtrasType('wd');
                setShowExtrasDialog(true);
              }}
              variant="secondary"
              className="h-12"
              data-testid="button-wide"
            >
              Wide (WD)
            </Button>
            
          </div>
          
          {/* Additional extras on separate row */}
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => {
                saveStateForUndo();
                setExtrasType('lb');
                setShowExtrasDialog(true);
              }}
              variant="secondary"
              className="h-12"
              data-testid="button-leg-bye"
            >
              Leg Bye (LB)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Players and Bowler */}
      <Card>
        <CardHeader>
          <CardTitle>Current Batsmen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold w-2/5">Name</th>
                  <th className="text-center py-2 px-3 font-semibold w-3/20">Runs</th>
                  <th className="text-center py-2 px-3 font-semibold w-3/20">Balls</th>
                  <th className="text-center py-2 px-3 font-semibold w-3/20">Strike Rate</th>
                  <th className="text-center py-2 px-3 font-semibold w-3/20">4's</th>
                  <th className="text-center py-2 px-3 font-semibold w-3/20">6's</th>
                </tr>
              </thead>
              <tbody>
                {/* Striker first */}
                <tr className="border-b bg-sky-50 dark:bg-slate-800" data-testid="striker-row">
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${matchState.strikeBatsman.name.length > 12 ? 'text-sm' : 'text-lg'}`}>
                        {matchState.strikeBatsman.name}
                      </span>
                      <Badge variant="default" className="text-xs">*</Badge>
                    </div>
                  </td>
                  <td className="text-center py-3 px-3 font-medium" data-testid="striker-runs">
                    {getCurrentBatsmanStats(true).runs}
                  </td>
                  <td className="text-center py-3 px-3" data-testid="striker-balls">
                    {getCurrentBatsmanStats(true).balls}
                  </td>
                  <td className="text-center py-3 px-3" data-testid="striker-strike-rate">
                    {getCurrentBatsmanStats(true).strikeRate}
                  </td>
                  <td className="text-center py-3 px-3" data-testid="striker-fours">
                    {getCurrentBatsmanStats(true).fours || 0}
                  </td>
                  <td className="text-center py-3 px-3" data-testid="striker-sixes">
                    {getCurrentBatsmanStats(true).sixes || 0}
                  </td>
                </tr>
                {/* Non-striker second */}
                <tr data-testid="non-striker-row">
                  <td className="py-3 px-3">
                    <span className={`font-semibold ${matchState.nonStrikeBatsman.name.length > 12 ? 'text-sm' : 'text-lg'}`}>
                      {matchState.nonStrikeBatsman.name}
                    </span>
                  </td>
                  <td className="text-center py-3 px-3 font-medium" data-testid="non-striker-runs">
                    {getCurrentBatsmanStats(false).runs}
                  </td>
                  <td className="text-center py-3 px-3" data-testid="non-striker-balls">
                    {getCurrentBatsmanStats(false).balls}
                  </td>
                  <td className="text-center py-3 px-3" data-testid="non-striker-strike-rate">
                    {getCurrentBatsmanStats(false).strikeRate}
                  </td>
                  <td className="text-center py-3 px-3" data-testid="non-striker-fours">
                    {getCurrentBatsmanStats(false).fours || 0}
                  </td>
                  <td className="text-center py-3 px-3" data-testid="non-striker-sixes">
                    {getCurrentBatsmanStats(false).sixes || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Current Bowler */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Current Bowler</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold w-2/5">Name</th>
                    <th className="text-center py-2 px-3 font-semibold w-3/20">Overs</th>
                    <th className="text-center py-2 px-3 font-semibold w-3/20">Runs</th>
                    <th className="text-center py-2 px-3 font-semibold w-3/20">Wickets</th>
                    <th className="text-center py-2 px-3 font-semibold w-3/20">Economy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-testid="bowler-row">
                    <td className="py-3 px-3">
                      <span className={`font-semibold ${matchState.currentBowler.name.length > 12 ? 'text-sm' : 'text-lg'}`}>
                        {matchState.currentBowler.name}
                      </span>
                    </td>
                    <td className="text-center py-3 px-3 font-medium" data-testid="bowler-overs">
                      {getCurrentBowlerStats().overs}
                    </td>
                    <td className="text-center py-3 px-3" data-testid="bowler-runs">
                      {getCurrentBowlerStats().runs}
                    </td>
                    <td className="text-center py-3 px-3" data-testid="bowler-wickets">
                      {getCurrentBowlerStats().wickets}
                    </td>
                    <td className="text-center py-3 px-3" data-testid="bowler-economy">
                      {getCurrentBowlerStats().economy}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Batting Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle>Batting Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold">Batsman</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">R</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">B</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">4's</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">6's</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">SR</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">Out</th>
                </tr>
              </thead>
              <tbody>
                {/* Only show batsmen who have batted or are currently batting */}
                {batsmanStats.map((batsman, index) => {
                  const isStriker = batsman.player.name === matchState.strikeBatsman.name;
                  const isNonStriker = batsman.player.name === matchState.nonStrikeBatsman.name;
                  const isCurrentBatsman = isStriker || isNonStriker;
                  
                  return (
                    <tr 
                      key={`${batsman.player.name}-${index}`}
                      className={`border-b ${isCurrentBatsman ? 'bg-sky-50 dark:bg-slate-800' : ''}`}
                      data-testid={`batting-stats-${index}`}
                    >
                      <td className="py-2 px-2">
                        <div className="flex items-center space-x-1">
                          <span className={`font-medium ${batsman.player.name.length > 15 ? 'text-xs' : 'text-sm'}`}>
                            {batsman.player.name}
                          </span>
                          {isStriker && <Badge variant="default" className="text-xs">*</Badge>}
                          {isNonStriker && !isStriker && <Badge variant="secondary" className="text-xs">•</Badge>}
                        </div>
                      </td>
                      <td className="text-center py-2 px-1 font-medium text-sm" data-testid={`batsman-runs-${index}`}>
                        {batsman.runs}
                      </td>
                      <td className="text-center py-2 px-1 text-sm" data-testid={`batsman-balls-${index}`}>
                        {batsman.balls}
                      </td>
                      <td className="text-center py-2 px-1 text-sm" data-testid={`batsman-fours-${index}`}>
                        {batsman.fours}
                      </td>
                      <td className="text-center py-2 px-1 text-sm" data-testid={`batsman-sixes-${index}`}>
                        {batsman.sixes}
                      </td>
                      <td className="text-center py-2 px-1 text-sm" data-testid={`batsman-sr-${index}`}>
                        {batsman.strikeRate.toFixed(1)}
                      </td>
                      <td className="text-center py-2 px-1 text-xs" data-testid={`batsman-dismissal-${index}`}>
                        {batsman.isOut ? (
                          <div className="text-red-600 dark:text-red-400">
                            {batsman.dismissalType}
                            {batsman.dismissalType === 'Caught' && batsman.fielderName && batsman.bowlerName ? (
                              <div className="text-xs text-muted-foreground">
                                c {batsman.fielderName} b {batsman.bowlerName}
                              </div>
                            ) : batsman.bowlerName ? (
                              <div className="text-xs text-muted-foreground">
                                b {batsman.bowlerName}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">Not Out</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Extras row */}
                <tr className="border-b font-medium">
                  <td className="py-2 px-2 text-sm">Extras</td>
                  <td className="text-center py-2 px-1 text-sm" data-testid="extras-total">
                    {battingTeamScore.extras.wides + battingTeamScore.extras.noBalls + battingTeamScore.extras.byes + battingTeamScore.extras.legByes}
                  </td>
                  <td className="text-center py-2 px-1 text-xs" colSpan={5}>
                    (W {battingTeamScore.extras.wides}, NB {battingTeamScore.extras.noBalls}, B {battingTeamScore.extras.byes}, LB {battingTeamScore.extras.legByes})
                  </td>
                </tr>

                {/* Total runs row */}
                <tr className="border-b font-bold">
                  <td className="py-2 px-2 text-sm">Total</td>
                  <td className="text-center py-2 px-1 text-sm" data-testid="team-total-runs">
                    {battingTeamScore.runs}
                  </td>
                  <td className="text-center py-2 px-1 text-xs" colSpan={5}>
                    ({battingTeamScore.wickets} wkts, {formatOvers(battingTeamScore.balls)} ov)
                  </td>
                </tr>

                {/* Yet to bat count */}
                {(() => {
                  const yetToBatCount = battingTeamPlayers.length - batsmanStats.length;
                  return yetToBatCount > 0 ? (
                    <tr className="text-muted-foreground">
                      <td className="py-2 px-2 text-sm">Yet to bat</td>
                      <td className="text-center py-2 px-1 text-sm" data-testid="yet-to-bat-count">
                        {yetToBatCount}
                      </td>
                      <td className="text-center py-2 px-1 text-xs" colSpan={5}>
                        players remaining
                      </td>
                    </tr>
                  ) : null;
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Full Bowling Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle>Bowling Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold">Bowler</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">Ov</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">R</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">W</th>
                  <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">Econ</th>
                </tr>
              </thead>
              <tbody>
                {bowlerStats.map((bowler, index) => {
                  const isCurrentBowler = bowler.player.name === matchState.currentBowler.name;
                  
                  return (
                    <tr 
                      key={`${bowler.player.name}-${index}`}
                      className={`border-b ${isCurrentBowler ? 'bg-sky-50 dark:bg-slate-800' : ''}`}
                      data-testid={`bowling-stats-${index}`}
                    >
                      <td className="py-2 px-2">
                        <div className="flex items-center space-x-1">
                          <span className={`font-medium ${bowler.player.name.length > 15 ? 'text-xs' : 'text-sm'}`}>
                            {bowler.player.name}
                          </span>
                          {isCurrentBowler && <Badge variant="default" className="text-xs">•</Badge>}
                        </div>
                      </td>
                      <td className="text-center py-2 px-1 font-medium text-sm" data-testid={`bowler-overs-${index}`}>
                        {formatCricketOvers(bowler.overs)}
                      </td>
                      <td className="text-center py-2 px-1 text-sm" data-testid={`bowler-runs-${index}`}>
                        {bowler.runs}
                      </td>
                      <td className="text-center py-2 px-1 text-sm" data-testid={`bowler-wickets-${index}`}>
                        {bowler.wickets}
                      </td>
                      <td className="text-center py-2 px-1 text-sm" data-testid={`bowler-economy-${index}`}>
                        {bowler.economy.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Wicket Dialog */}
      <Dialog open={showWicketDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Dismissal Type</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'] as DismissalType[]).map(type => (
              <Button
                key={type}
                onClick={() => {
                  handleWicket(type);
                  setShowWicketDialog(false);
                }}
                variant="outline"
                data-testid={`button-dismissal-${type.toLowerCase().replace(' ', '-')}`}
              >
                {type}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fielder Selection Dialog */}
      <Dialog open={showFielderDialog} onOpenChange={() => {}}>
        <DialogContent aria-describedby="fielder-selection-description">
          <DialogHeader>
            <DialogTitle>Select Fielder Who Took the Catch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the fielder from the bowling team who took the catch:
            </p>
            <ScrollArea className="h-60">
              <div className="grid gap-2">
                {bowlingTeamPlayers.map((player, index) => (
                  <Button
                    key={`${player.name}-${index}`}
                    onClick={() => handleFielderSelection(player)}
                    variant="outline"
                    className="justify-start"
                    data-testid={`button-fielder-${index}`}
                  >
                    {player.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Batsman Dialog */}
      <Dialog open={showBatsmanDialog} onOpenChange={() => {}}>
        <DialogContent aria-describedby="batsman-selection-description">
          <DialogHeader>
            <DialogTitle>
              {matchState?.currentInnings === 2 && batsmanStats.length === 0 
                ? "Select Opening Batsman (Striker)"
                : matchState?.currentInnings === 2 && batsmanStats.length === 1
                ? "Select Opening Batsman (Non-Striker)" 
                : "Select New Batsman"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-60">
            <div className="grid gap-2">
              {availableBatsmen.map((player, index) => (
                <Button
                  key={`${player.name}-${index}`}
                  onClick={() => selectNewBatsman(player)}
                  variant="outline"
                  className="justify-start"
                  data-testid={`button-new-batsman-${index}`}
                >
                  {player.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Extras Dialog */}
      <Dialog open={showExtrasDialog} onOpenChange={setShowExtrasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {extrasType === 'nb' ? 'No Ball Options' : 
               extrasType === 'wd' ? 'Wide + Additional Runs' : 
               'Leg Bye Runs'}
            </DialogTitle>
          </DialogHeader>
          {extrasType === 'nb' ? (
            <div className="space-y-4">
              {/* Regular No Ball Options */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">No Ball + Batsman Runs</h4>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    onClick={() => {
                      handleExtra('nb', 0);
                      setShowExtrasDialog(false);
                    }}
                    variant="outline"
                    data-testid="button-nb-0"
                    className="text-xs"
                  >
                    NB
                  </Button>
                  {[1, 2, 3, 4, 6].map(runs => (
                    <Button
                      key={runs}
                      onClick={() => {
                        handleExtra('nb', runs);
                        setShowExtrasDialog(false);
                      }}
                      variant="outline"
                      data-testid={`button-nb-${runs}`}
                      className="text-xs"
                    >
                      NB+{runs}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* No Ball + Leg Bye Options */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">No Ball + Leg Bye</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(runs => (
                    <Button
                      key={`lb-${runs}`}
                      onClick={() => {
                        handleExtra('nb', runs, true);
                        setShowExtrasDialog(false);
                      }}
                      variant="outline"
                      data-testid={`button-nb-lb-${runs}`}
                      className="text-xs"
                    >
                      NB+LB{runs}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {extrasType !== 'lb' && (
                <Button
                  onClick={() => {
                    handleExtra(extrasType!, 0);
                    setShowExtrasDialog(false);
                  }}
                  variant="outline"
                  data-testid={`button-${extrasType}-0`}
                >
                  {extrasType?.toUpperCase()}
                </Button>
              )}
              {(extrasType === 'lb' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 6]).map(runs => (
                <Button
                  key={runs}
                  onClick={() => {
                    handleExtra(extrasType!, runs);
                    setShowExtrasDialog(false);
                  }}
                  variant="outline"
                  data-testid={`button-${extrasType}-${runs}`}
                >
                  {extrasType === 'lb' ? `LB ${runs}` : `${extrasType?.toUpperCase()}+${runs}`}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Run Out Dialog */}
      <Dialog open={showRunOutDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Out - Runs Completed</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              How many runs were completed before the run out?
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3, 4, 5, 6].map(runs => (
                <Button
                  key={runs}
                  onClick={() => handleRunOut(runs)}
                  variant="outline"
                  data-testid={`button-runout-${runs}`}
                >
                  Run Out +{runs}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Who Is Out Dialog */}
      <Dialog open={showWhoIsOutDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who is Out?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which batsman was run out:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleWhoIsOut(true)}
                variant="outline"
                className="h-16 text-left p-4"
                data-testid="button-striker-out"
              >
                <div>
                  <div className="font-semibold">Striker</div>
                  <div className="text-sm text-muted-foreground">{matchState.strikeBatsman.name}</div>
                </div>
              </Button>
              <Button
                onClick={() => handleWhoIsOut(false)}
                variant="outline"
                className="h-16 text-left p-4"
                data-testid="button-non-striker-out"
              >
                <div>
                  <div className="font-semibold">Non-Striker</div>
                  <div className="text-sm text-muted-foreground">{matchState.nonStrikeBatsman.name}</div>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bowler Selection Dialog */}
      <Dialog open={showBowlerDialog} onOpenChange={setShowBowlerDialog}>
        <DialogContent aria-describedby="bowler-selection-description">
          <DialogHeader>
            <DialogTitle>
              {matchState?.currentInnings === 2 && !matchState.currentBowler.name 
                ? "Select Opening Bowler (Second Innings)"
                : "Select Next Bowler"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Over completed! Select the next bowler from the bowling team:
            </p>
            <ScrollArea className="h-60">
              <div className="grid gap-2">
                {availableBowlers.length > 0 ? (
                  availableBowlers.map((player, index) => (
                    <Button
                      key={`${player.name}-${index}`}
                      onClick={() => selectNewBowler(player)}
                      variant="outline"
                      className="justify-start"
                      data-testid={`button-new-bowler-${index}`}
                    >
                      {player.name}
                    </Button>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No bowlers available</p>
                    <p className="text-xs text-muted-foreground">
                      This can happen due to bowling restrictions. Please check match rules.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Innings Transition Dialog */}
      <Dialog open={showInningsTransition} onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="innings-transition-description">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">🏏 First Innings Complete!</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {matchState.firstInningsScore && (
              <>
                {/* Score Summary */}
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-primary">
                    {matchState.firstInningsScore.runs}/{matchState.firstInningsScore.wickets}
                  </div>
                  <div className="text-lg text-muted-foreground">
                    in {formatOvers(matchState.firstInningsScore.balls)} overs
                  </div>
                  <div className="text-xl font-semibold mt-4">
                    Target: {matchState.target} runs
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {userTeamBatsFirst ? 'Opponent team' : 'Your team'} needs {matchState.target} runs to win in {matchState.matchOvers} overs
                  </div>
                </div>

                {/* First Innings Batting Scorecard */}
                <Card>
                  <CardHeader>
                    <CardTitle>First Innings - Batting Scorecard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-semibold">Batsman</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">R</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">B</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">4's</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">6's</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">SR</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">Out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {firstInningsBatsmanStats.map((batsman, index) => (
                            <tr 
                              key={`${batsman.player.name}-${index}`}
                              className="border-b"
                              data-testid={`first-innings-batting-stats-${index}`}
                            >
                              <td className="py-2 px-2">
                                <span className={`font-medium ${batsman.player.name.length > 15 ? 'text-xs' : 'text-sm'}`}>
                                  {batsman.player.name}
                                </span>
                              </td>
                              <td className="text-center py-2 px-1 font-medium text-sm">
                                {batsman.runs}
                              </td>
                              <td className="text-center py-2 px-1 text-sm">
                                {batsman.balls}
                              </td>
                              <td className="text-center py-2 px-1 text-sm">
                                {batsman.fours}
                              </td>
                              <td className="text-center py-2 px-1 text-sm">
                                {batsman.sixes}
                              </td>
                              <td className="text-center py-2 px-1 text-sm">
                                {batsman.balls > 0 ? batsman.strikeRate.toFixed(1) : '0.0'}
                              </td>
                              <td className="text-center py-2 px-1 text-sm">
                                {batsman.isOut ? (
                                  <span className="text-red-600 font-medium">
                                    {batsman.dismissalType}
                                    {batsman.bowlerName && ` b ${batsman.bowlerName}`}
                                  </span>
                                ) : (
                                  <span className="text-green-600">Not Out</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* First Innings Bowling Scorecard */}
                <Card>
                  <CardHeader>
                    <CardTitle>First Innings - Bowling Scorecard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-semibold">Bowler</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">Ov</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">R</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">W</th>
                            <th className="text-center py-2 px-1 font-semibold text-xs sm:text-sm">Econ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {firstInningsBowlerStats.map((bowler, index) => (
                            <tr 
                              key={`${bowler.player.name}-${index}`}
                              className="border-b"
                              data-testid={`first-innings-bowling-stats-${index}`}
                            >
                              <td className="py-2 px-2">
                                <span className={`font-medium ${bowler.player.name.length > 15 ? 'text-xs' : 'text-sm'}`}>
                                  {bowler.player.name}
                                </span>
                              </td>
                              <td className="text-center py-2 px-1 font-medium text-sm">
                                {formatCricketOvers(bowler.overs)}
                              </td>
                              <td className="text-center py-2 px-1 text-sm">
                                {bowler.runs}
                              </td>
                              <td className="text-center py-2 px-1 text-sm">
                                {bowler.wickets}
                              </td>
                              <td className="text-center py-2 px-1 text-sm">
                                {bowler.economy.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Start Second Innings Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={startSecondInnings}
                    size="lg"
                    className="px-8 py-3"
                    data-testid="button-start-second-innings"
                  >
                    Start Second Innings
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Result Dialog */}
      <Dialog open={showMatchResult} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" aria-describedby="match-result-description">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {matchState?.matchResult === 'draw' ? '🤝 Match Drawn!' : 
               '🏆 Match Complete!'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center" id="match-result-description">
            {matchState?.matchResult && (
              <>
                <div className="text-xl font-semibold text-primary">
                  {matchState.matchResult === 'draw' 
                    ? 'Match is a Draw!' 
                    : `${matchState.winningTeam} Wins!`}
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="font-medium">Final Scores:</div>
                  <div>
                    First Innings: {matchState.firstInningsScore?.runs}/{matchState.firstInningsScore?.wickets} 
                    ({formatOvers(matchState.firstInningsScore?.balls || 0)} ov)
                  </div>
                  <div>
                    Second Innings: {battingTeamScore.runs}/{battingTeamScore.wickets} 
                    ({formatOvers(battingTeamScore.balls)} ov)
                  </div>
                  
                  {matchState.matchResult === 'second_team_wins' && (
                    <div className="text-green-600 font-medium mt-2">
                      Target of {matchState.target} reached with {(matchState.matchOvers * 6) - battingTeamScore.balls} balls remaining!
                    </div>
                  )}
                  
                  {matchState.matchResult === 'first_team_wins' && (
                    <div className="text-blue-600 font-medium mt-2">
                      {battingTeamScore.wickets >= 10 
                        ? 'All out! Target not reached.'
                        : `Won by ${(matchState.target || 0) - battingTeamScore.runs - 1} runs`}
                    </div>
                  )}
                  
                  {matchState.matchResult === 'draw' && (
                    <div className="text-yellow-600 font-medium mt-2">
                      Both teams scored equally!
                    </div>
                  )}
                </div>
                
                {/* Man of the Match Section */}
                {manOfTheMatchData && (
                  <div className="border-t pt-4 mt-4">
                    <div className="text-center space-y-3">
                      <div className="flex justify-center items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        <span className="text-lg font-semibold text-primary">Man of the Match</span>
                      </div>
                      
                      {/* Player Name and Username */}
                      <div className="space-y-1">
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                          {manOfTheMatchData.playerName}
                        </div>
                        {manOfTheMatchData.username && (
                          <div className="text-sm text-muted-foreground">
                            @{manOfTheMatchData.username}
                          </div>
                        )}
                      </div>
                      
                      {/* Detailed Cricket Statistics */}
                      {manOfTheMatchData.detailedStats && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
                          <div className="text-sm font-medium text-primary mb-2">Match Performance</div>
                          
                          {/* Batting Stats */}
                          {manOfTheMatchData.detailedStats.ballsFaced > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">🏏 Batting:</span>
                              <span className="font-medium">
                                {manOfTheMatchData.detailedStats.runsScored} ({manOfTheMatchData.detailedStats.ballsFaced})
                              </span>
                            </div>
                          )}
                          
                          {/* Bowling Stats */}
                          {manOfTheMatchData.detailedStats.oversBowled > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">⚾ Bowling:</span>
                              <span className="font-medium">
                                {manOfTheMatchData.detailedStats.runsConceded}-{manOfTheMatchData.detailedStats.wicketsTaken}
                                {manOfTheMatchData.detailedStats.oversBowled > 0 && (
                                  <span className="text-muted-foreground ml-1">
                                    ({formatCricketOvers(manOfTheMatchData.detailedStats.oversBowled)} ov)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          
                          {/* Fielding Stats */}
                          {manOfTheMatchData.detailedStats.catchesTaken > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">🥎 Catches:</span>
                              <span className="font-medium">
                                {manOfTheMatchData.detailedStats.catchesTaken}
                              </span>
                            </div>
                          )}
                          
                          {/* Performance Score */}
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Performance Score:</span>
                              <span className="font-bold text-primary">
                                {manOfTheMatchData.performanceScore} pts
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMatchResult(false);
                      setLocation('/dashboard');
                    }}
                    data-testid="button-back-dashboard"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}