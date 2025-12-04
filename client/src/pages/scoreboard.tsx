import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, ArrowLeft, Search, X } from 'lucide-react';
import { type LocalPlayer } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [manOfTheMatchData, setManOfTheMatchData] = useState<any>(null);
  const [matchSummaryId, setMatchSummaryId] = useState<string | null>(null);
  const [showTossDialog, setShowTossDialog] = useState(false);
  const [tossWinner, setTossWinner] = useState<'myTeam' | 'opponent' | null>(null);
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null);
  
  // New Batsman Dialog search and selection states
  const [batsmanSearchQuery, setBatsmanSearchQuery] = useState('');
  const [selectedBatsman, setSelectedBatsman] = useState<LocalPlayer | null>(null);
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
      
      // Check if returning from bowler selection page
      const bowlerSelected = localStorage.getItem('bowlerSelected');
      const savedCurrentMatchState = localStorage.getItem('currentMatchState');
      const savedCurrentBowlerStats = localStorage.getItem('currentBowlerStats');
      const savedCurrentBattingTeamScore = localStorage.getItem('currentBattingTeamScore');
      const savedCurrentBatsmanStats = localStorage.getItem('currentBatsmanStats');
      const savedCurrentOverBalls = localStorage.getItem('currentOverBalls');
      
      if (bowlerSelected && savedCurrentMatchState && savedCurrentBowlerStats) {
        // Load updated state from bowler selection
        const updatedMatchState = JSON.parse(savedCurrentMatchState);
        const updatedBowlerStats = JSON.parse(savedCurrentBowlerStats);
        
        setMatchState(updatedMatchState);
        setBowlerStats(updatedBowlerStats);
        
        // Restore scoring data if available
        if (savedCurrentBattingTeamScore) {
          setBattingTeamScore(JSON.parse(savedCurrentBattingTeamScore));
        }
        if (savedCurrentBatsmanStats) {
          setBatsmanStats(JSON.parse(savedCurrentBatsmanStats));
        }
        if (savedCurrentOverBalls) {
          setCurrentOverBalls(JSON.parse(savedCurrentOverBalls));
        }
        
        // Initialize the ref with the restored balls count to prevent over completion loop
        if (savedCurrentBattingTeamScore) {
          const restoredScore = JSON.parse(savedCurrentBattingTeamScore);
          prevBallsRef.current = restoredScore.balls;
        }
        
        // Clear the selection flag and temporary state
        localStorage.removeItem('bowlerSelected');
        localStorage.removeItem('currentMatchState');
        localStorage.removeItem('currentBattingTeamScore');
        localStorage.removeItem('currentBowlerStats');
        localStorage.removeItem('currentBatsmanStats');
        localStorage.removeItem('currentOverBalls');
        localStorage.removeItem('currentPreviousBowler');
        
        return; // Skip the normal initialization
      }
      
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

  // Track previous ball count to detect over completion
  const prevBallsRef = useRef(0);
  
  // Watch for over completion after state updates are complete
  useEffect(() => {
    // Only check if balls has actually changed and we're not in initial load
    if (battingTeamScore.balls !== prevBallsRef.current && battingTeamScore.balls > 0) {
      // Check if current ball count is a multiple of 6 (completed over)
      if (battingTeamScore.balls % 6 === 0) {
        handleOverCompletion(battingTeamScore.balls);
      }
      // Update the previous count
      prevBallsRef.current = battingTeamScore.balls;
    }
  }, [battingTeamScore.balls]);

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
  // Function to save match summary for historical access
  const saveMatchSummary = async (allPlayerPerformances: any[], hasAnyDatabaseTeam: boolean, manOfTheMatchResult?: any) => {
    try {
      // Check if match should be saved as summary
      const hasAnyPlayerWithAccount = allPlayerPerformances.some(p => p.userId);
      const shouldSaveMatchSummary = hasAnyPlayerWithAccount || hasAnyDatabaseTeam;
      
      if (!shouldSaveMatchSummary) {
        console.log('No need to save match summary - no players with accounts and no database teams');
        return;
      }
      
      console.log('Saving match summary to database...');
      
      // Get team information
      const myTeamId = localStorage.getItem('myTeamId') || '';
      const opponentTeamId = localStorage.getItem('opponentTeamId') || '';
      const myTeamName = localStorage.getItem('myTeamName') || 'My Team';
      const opponentTeamName = localStorage.getItem('opponentTeamName') || 'Opponent Team';
      
      // Get match details
      const userTeamBatsFirst = matchState?.userTeamRole.includes('batting');
      const firstInningsScore = matchState?.firstInningsScore || { runs: 0, wickets: 0, overs: 0 };
      // Normalize overs to proper format (e.g., 4.3 not 4.5)
      const normalizeOvers = (overs: number, balls: number) => {
        return parseFloat((overs + (balls / 6)).toFixed(2));
      };
      const secondInningsScore = { 
        runs: battingTeamScore.runs, 
        wickets: battingTeamScore.wickets, 
        overs: normalizeOvers(battingTeamScore.overs, battingTeamScore.balls)
      };
      
      // Determine winning team - ensure it's never empty
      let winningTeam = 'Draw'; // Default fallback
      if (matchState?.matchResult === 'first_team_wins') {
        winningTeam = userTeamBatsFirst ? myTeamName : opponentTeamName;
      } else if (matchState?.matchResult === 'second_team_wins') {
        winningTeam = userTeamBatsFirst ? opponentTeamName : myTeamName;
      } else if (matchState?.matchResult === 'draw') {
        winningTeam = 'Draw';
      }
      
      // Ensure winningTeam is never empty
      if (!winningTeam || winningTeam.trim() === '') {
        winningTeam = 'Draw';
      }
      
      // Create comprehensive batting stats for both innings
      const formatBattingStats = (stats: BatsmanStats[]) => {
        return stats.map(stat => ({
          playerName: stat.player.name,
          runs: stat.runs,
          balls: stat.balls,
          fours: stat.fours || 0,
          sixes: stat.sixes || 0,
          strikeRate: stat.balls > 0 ? parseFloat(((stat.runs / stat.balls) * 100).toFixed(2)) : 0,
          dismissalType: stat.dismissalType || 'Not Out',
          bowlerName: stat.bowlerName || '',
          fielderName: stat.fielderName || ''
        }));
      };
      
      // Create comprehensive bowling stats for both innings  
      const formatBowlingStats = (stats: BowlerStats[]) => {
        return stats.map(stat => {
          // Convert cricket overs to decimal for economy calculation
          const oversStr = stat.overs.toString();
          const [overs, balls] = oversStr.split('.');
          const decimalOvers = parseInt(overs || '0') + (parseInt(balls || '0') / 6);
          
          return {
            playerName: stat.player.name,
            overs: stat.overs,
            maidens: 0, // TODO: Track maidens in bowling stats
            runs: stat.runs,
            wickets: stat.wickets,
            economy: decimalOvers > 0 ? parseFloat((stat.runs / decimalOvers).toFixed(2)) : 0
          };
        });
      };
      
      // Determine match result in the correct format
      let matchResult: "HOME_WIN" | "AWAY_WIN" | "DRAW";
      if (matchState?.matchResult === 'draw') {
        matchResult = 'DRAW';
      } else if (matchState?.matchResult === 'first_team_wins') {
        matchResult = userTeamBatsFirst ? 'HOME_WIN' : 'AWAY_WIN';
      } else if (matchState?.matchResult === 'second_team_wins') {
        matchResult = userTeamBatsFirst ? 'AWAY_WIN' : 'HOME_WIN';
      } else {
        matchResult = 'DRAW'; // fallback
      }
      
      // Create match summary data with correct schema structure
      const matchSummaryData = {
        homeTeamId: myTeamId || undefined,
        homeTeamName: myTeamName,
        awayTeamId: opponentTeamId || undefined,
        awayTeamName: opponentTeamName,
        matchDate: new Date().toISOString(),
        venue: 'Local Ground',
        result: matchResult,
        winningTeam,
        
        // Innings information - determine which team batted first
        firstInningsTeam: userTeamBatsFirst ? myTeamName : opponentTeamName,
        firstInningsRuns: firstInningsScore.runs,
        firstInningsWickets: firstInningsScore.wickets,
        firstInningsOvers: firstInningsScore.overs,
        
        secondInningsTeam: userTeamBatsFirst ? opponentTeamName : myTeamName,
        secondInningsRuns: secondInningsScore.runs,
        secondInningsWickets: secondInningsScore.wickets,
        secondInningsOvers: secondInningsScore.overs,
        
        // Match context
        target: matchState?.target,
        totalOvers: matchState?.matchOvers || 20,
        
        // Man of the match
        manOfTheMatchPlayerName: manOfTheMatchResult?.playerName,
        manOfTheMatchUserId: manOfTheMatchResult?.userId || undefined,
        manOfTheMatchStats: manOfTheMatchResult || undefined,
        
        // Player data - always map chronologically (first innings is first, second innings is second)
        firstInningsBatsmen: formatBattingStats(firstInningsBatsmanStats),
        firstInningsBowlers: formatBowlingStats(firstInningsBowlerStats), 
        secondInningsBatsmen: formatBattingStats(batsmanStats),
        secondInningsBowlers: formatBowlingStats(bowlerStats)
      };
      
      // Save match summary
      const response = await apiRequest('POST', '/api/match-summary', matchSummaryData);
      
      if (response.ok) {
        const savedMatchSummary = await response.json();
        setMatchSummaryId(savedMatchSummary.id);
        console.log('Match summary saved successfully:', savedMatchSummary.id);
        
        // Also save individual player match history records
        await savePlayerMatchHistories(savedMatchSummary.id, allPlayerPerformances);
      } else {
        console.error('Failed to save match summary:', await response.text());
      }
    } catch (error) {
      console.error('Error saving match summary:', error);
    }
  };

  // Function to save individual player match history records
  const savePlayerMatchHistories = async (matchSummaryId: string, allPlayerPerformances: any[]) => {
    try {
      const playerHistories = allPlayerPerformances
        .filter(perf => perf.userId) // Only save for players with accounts
        .map(perf => ({
          matchSummaryId,
          userId: perf.userId,
          teamName: perf.teamName || 'Unknown Team',
          teamId: perf.teamId || undefined,
          playerName: perf.playerName || 'Unknown Player',
          runsScored: perf.runsScored || 0,
          ballsFaced: perf.ballsFaced || 0,
          oversBowled: perf.oversBowled || 0,
          wicketsTaken: perf.wicketsTaken || 0,
          isManOfTheMatch: false // Will be updated based on manOfTheMatchUserId in summary
        }));
      
      // Save all player histories
      for (const history of playerHistories) {
        const response = await apiRequest('POST', '/api/player-match-history', history);
        
        if (!response.ok) {
          console.error('Failed to save player match history for user:', history.userId);
        }
      }
      
      console.log(`Saved match history for ${playerHistories.length} players with accounts`);
    } catch (error) {
      console.error('Error saving player match histories:', error);
    }
  };

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
      
      // Get team IDs from localStorage to determine which endpoint to use
      const myTeamId = localStorage.getItem('myTeamId') || '';
      const opponentTeamId = localStorage.getItem('opponentTeamId') || '';
      const myTeamName = localStorage.getItem('myTeamName') || 'My Team';
      const opponentTeamName = localStorage.getItem('opponentTeamName') || 'Opponent Team';
      
      // Determine if any database teams are involved
      const hasMyTeam = myTeamId.trim() !== '';
      const hasOpponentTeam = opponentTeamId.trim() !== '';
      const hasAnyDatabaseTeam = hasMyTeam || hasOpponentTeam;
      
      console.log('=== TEAM STATISTICS DEBUG ===');
      console.log('Team IDs from localStorage:', {
        myTeamId: myTeamId || '(empty)',
        opponentTeamId: opponentTeamId || '(empty)',
        myTeamName,
        opponentTeamName
      });
      console.log('Team analysis:', {
        hasMyTeam,
        hasOpponentTeam,
        hasAnyDatabaseTeam,
        willUseTeamEndpoint: hasAnyDatabaseTeam
      });
      
      // Additional debug: Check what was originally stored during match creation
      console.log('All localStorage team-related data:');
      Object.keys(localStorage).filter(key => key.includes('Team')).forEach(key => {
        console.log(`  ${key}: ${localStorage.getItem(key)}`);
      });

      let endpoint, requestBody, response;

      if (hasAnyDatabaseTeam) {
        // Use team match results endpoint for database teams
        endpoint = '/api/team-match-results';
        
        // Determine match result based on final scores
        const userTeamBatsFirst = matchState.userTeamRole.includes('batting');
        const firstInningsScore = matchState.firstInningsScore || { runs: 0, wickets: 0, overs: 0 };
        const secondInningsScore = { 
          runs: battingTeamScore.runs, 
          wickets: battingTeamScore.wickets, 
          overs: battingTeamScore.overs + (battingTeamScore.balls / 6) 
        };
        
        // Determine team scores based on team identity, not batting order
        let homeTeamRuns, homeTeamWickets, homeTeamOvers;
        let awayTeamRuns, awayTeamWickets, awayTeamOvers;
        let result;
        
        // Determine which team is home/away based on team identity
        // My team (user's team) is always the home team in this setup
        const myTeamScore = userTeamBatsFirst ? firstInningsScore : secondInningsScore;
        const opponentTeamScore = userTeamBatsFirst ? secondInningsScore : firstInningsScore;
        
        // Assign scores based on actual team identity (home vs away)
        homeTeamRuns = myTeamScore.runs;
        homeTeamWickets = myTeamScore.wickets;
        homeTeamOvers = myTeamScore.overs;
        awayTeamRuns = opponentTeamScore.runs;
        awayTeamWickets = opponentTeamScore.wickets;
        awayTeamOvers = opponentTeamScore.overs;
        
        // Determine match result based on actual scores
        if (homeTeamRuns > awayTeamRuns) {
          result = "HOME_WIN";
        } else if (awayTeamRuns > homeTeamRuns) {
          result = "AWAY_WIN";
        } else {
          result = "DRAW";
        }

        // Map player performances to team-based format
        // Use teamSide instead of fragile name-based matching
        const teamPlayerPerformances = allPlayerPerformances.map(perf => {
          // Find the player in both teams to get their teamSide
          const playerInMyTeam = matchState.myTeamPlayers.find(p => p.name === perf.playerName);
          const playerInOpponentTeam = matchState.opponentTeamPlayers.find(p => p.name === perf.playerName);
          
          let isMyTeamPlayer = false;
          let teamSide = null;
          
          if (playerInMyTeam) {
            isMyTeamPlayer = true;
            teamSide = playerInMyTeam.teamSide || 'my';
          } else if (playerInOpponentTeam) {
            isMyTeamPlayer = false;
            teamSide = playerInOpponentTeam.teamSide || 'opponent';
          } else {
            // Fallback to name-based matching if teamSide is not available (backward compatibility)
            console.warn(`Player ${perf.playerName} not found in either team, falling back to name matching`);
            isMyTeamPlayer = matchState.myTeamPlayers.some(p => p.name === perf.playerName);
            teamSide = isMyTeamPlayer ? 'my' : 'opponent';
          }
          
          return {
            ...perf,
            teamId: isMyTeamPlayer ? myTeamId || undefined : opponentTeamId || undefined,
            teamName: isMyTeamPlayer ? myTeamName : opponentTeamName,
            teamSide: teamSide,
            fours: 0, // TODO: Track fours in match scoring
            sixes: 0, // TODO: Track sixes in match scoring 
            runOuts: 0 // TODO: Track run outs in match scoring
          };
        });

        requestBody = {
          homeTeamId: hasMyTeam ? myTeamId : undefined,
          homeTeamName: myTeamName,
          awayTeamId: hasOpponentTeam ? opponentTeamId : undefined,
          awayTeamName: opponentTeamName,
          matchDate: new Date().toISOString(),
          venue: 'Local Ground',
          result,
          homeTeamRuns,
          homeTeamWickets,
          homeTeamOvers,
          awayTeamRuns,
          awayTeamWickets,
          awayTeamOvers,
          playerPerformances: teamPlayerPerformances
        };
      } else {
        // Use local match results endpoint for purely local teams
        endpoint = '/api/local-match-results';
        requestBody = {
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
        };
      }

      console.log(`=== ENDPOINT SELECTION ===`);
      console.log(`Selected endpoint: ${endpoint}`);
      console.log(`Reason: ${hasAnyDatabaseTeam ? 'At least one database team involved' : 'Only local teams involved'}`);
      console.log('Request body summary:', {
        endpoint,
        hasHomeTeamId: !!requestBody.homeTeamId,
        hasAwayTeamId: !!requestBody.awayTeamId,
        playerCount: requestBody.playerPerformances?.length || 0,
        scenario: hasMyTeam && hasOpponentTeam ? 'both_database' : 
                 hasMyTeam ? 'only_my_team_database' : 
                 hasOpponentTeam ? 'only_opponent_database' : 'both_local'
      });
      console.log(`Full request body:`, requestBody);
      
      // Check for auth token if using authenticated endpoints
      const token = localStorage.getItem('auth_token');
      if ((endpoint === '/api/team-match-results' || endpoint === '/api/local-match-results') && !token) {
        console.error('No auth token found for authenticated endpoint:', endpoint);
        toast({
          title: "Authentication Required",
          description: "Please log in again to save match statistics.",
          variant: "destructive",
        });
        return;
      }
      
      console.log(`=== AUTH DEBUG ===`);
      console.log(`Auth token present: ${!!token}`);
      console.log(`Auth token length: ${token ? token.length : 0}`);
      console.log(`Using authenticated endpoint: ${endpoint === '/api/team-match-results' || endpoint === '/api/local-match-results'}`);
      
      // Send to backend using shared API client
      response = await apiRequest('POST', endpoint, requestBody);

      console.log(`=== BACKEND RESPONSE ===`);
      console.log(`Response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result);
        
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
        
        // Also save match summary if at least one player has an account or it's a formal team match
        await saveMatchSummary(allPlayerPerformances, hasAnyDatabaseTeam, result.manOfTheMatch);
        
      } else {
        const errorText = await response.text();
        console.error('=== STATS UPDATE FAILED ===');
        console.error('Status:', response.status, response.statusText);
        console.error('Error response:', errorText);
        console.error('Request details:', {
          endpoint,
          hasMyTeam,
          hasOpponentTeam,
          hasAnyDatabaseTeam,
          requestBody
        });
        toast({
          title: "Stats Update Failed",
          description: "There was an issue updating player statistics. Check console for details.",
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
        
        // Calculate the updated batsman stats that would include this final ball
        const updatedBatsmanStats = batsmanStats.map(stat => {
          if (stat.player.name === matchState.strikeBatsman.name) {
            const newBatsmanRuns = stat.runs + runsToAdd;
            const newBatsmanBalls = stat.balls + 1;
            const newStrikeRate = newBatsmanBalls > 0 ? (newBatsmanRuns / newBatsmanBalls) * 100 : 0;
            
            return {
              ...stat,
              runs: newBatsmanRuns,
              balls: newBatsmanBalls,
              strikeRate: Math.round(newStrikeRate * 100) / 100
            };
          }
          return stat;
        });
        
        handleInningsComplete(updatedScore, updatedBatsmanStats, updatedBowlerStats);
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
    const allWicketsLost = currentScore.wickets >= getMaxWicketsForCurrentInnings(); // All wickets lost
    
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
        // Second team scored less than first team - first team wins
        result = 'first_team_wins';
        winningTeam = matchState.userTeamRole.includes('bowling') ? 'Your Team' : 'Opponent Team';
      } else if (currentScore.runs === matchState.target - 1) {
        // Scores are equal (both teams scored same) - draw
        result = 'draw';
      }
      // Note: currentScore.runs >= matchState.target case is already handled above in targetReached condition
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
        setIsFinalizing(true);
        try {
          await postStatsAutomatically();
          setShowMatchResult(true);
        } catch (error) {
          console.error('Error finalizing match:', error);
        } finally {
          setIsFinalizing(false);
        }
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

  // Centralized over completion handler
  const handleOverCompletion = (newBalls: number) => {
    if (newBalls % 6 === 0) {
      const newOvers = Math.floor(newBalls / 6);
      if (matchState && newOvers < matchState.matchOvers) {
        // End of over but innings continues - set previous bowler and show dialog
        if (matchState.currentBowler) {
          setPreviousBowler(matchState.currentBowler);
        }
        
        // Rotate strike only when over is actually completed and balls > 0
        if (newBalls > 0) {
          rotateStrike();
        }
        
        // Navigate to bowler selection page
        setTimeout(() => {
          // Save current state to localStorage for the bowler selection page
          localStorage.setItem('currentMatchState', JSON.stringify(matchState));
          localStorage.setItem('currentBattingTeamScore', JSON.stringify(battingTeamScore));
          localStorage.setItem('currentBowlerStats', JSON.stringify(bowlerStats));
          localStorage.setItem('currentBatsmanStats', JSON.stringify(batsmanStats));
          localStorage.setItem('currentOverBalls', JSON.stringify(currentOverBalls));
          localStorage.setItem('currentPreviousBowler', JSON.stringify(matchState.currentBowler));
          setLocation('/bowler-selection');
        }, 500);
      }
    }
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
    
    // Over completion will be handled by useEffect watching battingTeamScore.balls
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
      
      // Check for end of over using centralized handler
      handleOverCompletion(battingTeamScore.balls + 1);
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
          // When batter hits no-ball: they get runs AND face the ball, but bowler must bowl again
          updateBatsmanStats(matchState.strikeBatsman, additionalRuns, true);
          
          // Rotate strike for odd additional runs
          if (shouldRotateStrike(additionalRuns)) {
            rotateStrike();
          }
        } else {
          // No-ball faced but no runs scored: batsman still faces the ball
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
      if (matchState && !matchState.firstInningsComplete && (newBalls >= matchState.matchOvers * 6 || updatedScore.wickets >= getMaxWicketsForCurrentInnings())) {
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
          
          // Calculate the updated batsman stats that would include this final ball (wicket ball)
          const updatedBatsmanStats = batsmanStats.map(stat => {
            if (stat.player.name === matchState.strikeBatsman.name) {
              const newBatsmanBalls = stat.balls + 1;
              const newStrikeRate = newBatsmanBalls > 0 ? (stat.runs / newBatsmanBalls) * 100 : 0;
              
              return {
                ...stat,
                balls: newBatsmanBalls,
                strikeRate: Math.round(newStrikeRate * 100) / 100
              };
            }
            return stat;
          });
          
          handleInningsComplete(updatedScore, updatedBatsmanStats, updatedBowlerStats);
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
    
    // Over completion will be handled by useEffect watching battingTeamScore.balls
    
    // Only show batsman dialog if this is not the last ball of the over
    // If it's the 6th ball, let over completion handle the flow
    const willBeLastBall = (battingTeamScore.balls + 1) % 6 === 0;
    if (!willBeLastBall) {
      setShowBatsmanDialog(true);
      setPendingWicket(dismissalType);
    }
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
      if (matchState && !matchState.firstInningsComplete && (newBalls >= matchState.matchOvers * 6 || updatedScore.wickets >= getMaxWicketsForCurrentInnings())) {
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
    
    // Over completion will be handled by useEffect watching battingTeamScore.balls
    
    // Clean up and show new batsman dialog (only if not last ball of over)
    setShowFielderDialog(false);
    setPendingCaughtDismissal(null);
    
    const willBeLastBall = (battingTeamScore.balls + 1) % 6 === 0;
    if (!willBeLastBall) {
      setShowBatsmanDialog(true);
      setPendingWicket(pendingCaughtDismissal);
    }
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
      if (matchState && !matchState.firstInningsComplete && updatedScore.wickets >= getMaxWicketsForCurrentInnings()) {
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
          
          // Calculate the updated batsman stats that would include this final ball (run out ball)
          const updatedBatsmanStats = batsmanStats.map(stat => {
            if (stat.player.name === matchState.strikeBatsman.name) {
              const newBatsmanRuns = stat.runs + runOutRuns;
              const newBatsmanBalls = stat.balls + 1;
              const newStrikeRate = newBatsmanBalls > 0 ? (newBatsmanRuns / newBatsmanBalls) * 100 : 0;
              
              return {
                ...stat,
                runs: newBatsmanRuns,
                balls: newBatsmanBalls,
                strikeRate: Math.round(newStrikeRate * 100) / 100
              };
            }
            return stat;
          });
          
          handleInningsComplete(updatedScore, updatedBatsmanStats, updatedBowlerStats);
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
    
    // Over completion will be handled by useEffect watching battingTeamScore.balls
    
    // Track which batsman is out for replacement (don't rotate yet)
    setOutBatsmanIsStriker(isStriker);
    setPendingWicket('Run Out');
    
    setShowWhoIsOutDialog(false);
    
    // Only show batsman dialog if this is not the last ball of the over
    const willBeLastBall = (battingTeamScore.balls + 1) % 6 === 0;
    if (!willBeLastBall) {
      setShowBatsmanDialog(true);
    }
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
    
    // Update match state with new bowler
    setMatchState(prev => prev ? {
      ...prev,
      currentBowler: newBowler
    } : null);
    
    // Reset current over balls (strike rotation is handled by handleOverCompletion)
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
      // Save current state to localStorage for the bowler selection page
      localStorage.setItem('currentMatchState', JSON.stringify(matchState));
      localStorage.setItem('currentBattingTeamScore', JSON.stringify(battingTeamScore));
      localStorage.setItem('currentBowlerStats', JSON.stringify(bowlerStats));
      localStorage.setItem('currentBatsmanStats', JSON.stringify(batsmanStats));
      localStorage.setItem('currentOverBalls', JSON.stringify(currentOverBalls));
      localStorage.setItem('currentPreviousBowler', JSON.stringify(previousBowler));
      setLocation('/bowler-selection');
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

  const filteredBatsmen = availableBatsmen.filter(player => 
    player.name.toLowerCase().includes(batsmanSearchQuery.toLowerCase())
  );

  const confirmBatsmanSelection = () => {
    if (selectedBatsman) {
      selectNewBatsman(selectedBatsman);
      setSelectedBatsman(null);
      setBatsmanSearchQuery('');
      setShowBatsmanDialog(false);
    }
  };

  const cancelBatsmanSelection = () => {
    setSelectedBatsman(null);
    setBatsmanSearchQuery('');
    setShowBatsmanDialog(false);
  };
  
  const bowlingTeamPlayers = (userTeamBatsFirst ? matchState.opponentTeamPlayers : matchState.myTeamPlayers)
    .filter(player => player.name && player.name.trim() !== '');
  
  // Store the previous bowler to prevent consecutive overs

  // Strict bowling selection - exclude current bowler and previous bowler
  const availableBowlers = bowlingTeamPlayers.filter((player: LocalPlayer) => {
    // Always exclude current bowler (cannot bowl consecutive balls)
    if (player.name === matchState?.currentBowler.name) return false;
    
    // Always exclude previous bowler to prevent consecutive overs (except first over)
    if (previousBowler && player.name === previousBowler.name && battingTeamScore.balls > 0) return false;
    
    return true;
  });

  const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
  };

  // Calculate total balls actually faced by batsmen (excludes wides, includes no-balls when batsman faced them)
  const getTotalBallsFacedByBatsmen = (statsArray: BatsmanStats[]) => {
    return statsArray.reduce((total, stat) => total + stat.balls, 0);
  };

  // Calculate maximum wickets based on current batting team size (team size - 1)
  const getMaxWicketsForCurrentInnings = () => {
    const userTeamBatsFirst = matchState?.userTeamRole.includes('batting');
    const battingTeamPlayers = userTeamBatsFirst 
      ? matchState?.myTeamPlayers.filter(p => p.name.trim() !== '') || []
      : matchState?.opponentTeamPlayers.filter(p => p.name.trim() !== '') || [];
    
    return Math.max(battingTeamPlayers.length - 1, 1); // At least 1 wicket needed
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Back Button */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center p-4 max-w-6xl mx-auto">
          <Button 
            onClick={() => setLocation('/local-match')}
            variant="ghost"
            size="icon"
            data-testid="button-back-to-create-match"
            className="mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Match Centre</h1>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs defaultValue="scoring" className="w-full">
          <div className="border-b px-4">
            <TabsList className="bg-transparent border-b-0 h-auto p-0 w-full justify-start overflow-x-auto">
              <TabsTrigger 
                value="scoring" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                data-testid="tab-scoring"
              >
                Scoring
              </TabsTrigger>
              <TabsTrigger 
                value="scorecard"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                data-testid="tab-scorecard"
              >
                Scorecard
              </TabsTrigger>
              <TabsTrigger 
                value="stats"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                data-testid="tab-stats"
              >
                Stats
              </TabsTrigger>
              <TabsTrigger 
                value="super-stars"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                data-testid="tab-super-stars"
              >
                Super Stars
              </TabsTrigger>
              <TabsTrigger 
                value="balls"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                data-testid="tab-balls"
              >
                Balls
              </TabsTrigger>
              <TabsTrigger 
                value="info"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                data-testid="tab-info"
              >
                Info
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Scoring Tab Content */}
          <TabsContent value="scoring" className="flex-1 mt-0">
            <div className="p-4 max-w-6xl mx-auto space-y-6 pb-32">
              {/* Team and Score Display */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">
                  {userTeamBatsFirst ? matchState.myTeamPlayers[0]?.name.split(' ')[0] || 'Your Team' : matchState.opponentTeamPlayers[0]?.name.split(' ')[0] || 'Opponent'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {matchState.currentInnings === 1 ? '1st Innings' : '2nd Innings'}
                </p>
                
                <div className="text-5xl font-bold text-green-600 dark:text-green-500 my-4">
                  {battingTeamScore.runs}-{battingTeamScore.wickets}
                </div>
                
                {/* Match Info Row */}
                <div className="flex justify-center gap-8 text-sm text-muted-foreground">
                  <span>Extras - {battingTeamScore.extras.wides + battingTeamScore.extras.noBalls + battingTeamScore.extras.byes + battingTeamScore.extras.legByes}</span>
                  <span>Overs - {formatOvers(battingTeamScore.balls)} / {matchState.matchOvers}</span>
                  <span>CRR - {battingTeamScore.balls > 0 ? (battingTeamScore.runs / (battingTeamScore.balls / 6)).toFixed(2) : '0.00'}</span>
                </div>
                
                {/* Partnership */}
                <div className="text-sm text-muted-foreground mt-2">
                  Partnership - {getCurrentBatsmanStats(true).runs + getCurrentBatsmanStats(false).runs}({getCurrentBatsmanStats(true).balls + getCurrentBatsmanStats(false).balls})
                </div>
              </div>
              
              {/* Current Batsmen Table */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">✏️ Batsman</span>
                </div>
                <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left p-2 font-medium">R</th>
                        <th className="text-center p-2 font-medium">B</th>
                        <th className="text-center p-2 font-medium">4s</th>
                        <th className="text-center p-2 font-medium">6s</th>
                        <th className="text-center p-2 font-medium">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 text-sm" data-testid="batsman-1-name">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-sm" data-testid="batsman-2-name">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Current Bowler Table */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">✏️ Bowler</span>
                </div>
                <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left p-2 font-medium">O</th>
                        <th className="text-center p-2 font-medium">M</th>
                        <th className="text-center p-2 font-medium">R</th>
                        <th className="text-center p-2 font-medium">W</th>
                        <th className="text-center p-2 font-medium">Eco</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 text-sm" data-testid="bowler-name">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                        <td className="text-center p-2 text-sm">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Bottom Orange Panel for Player Selection */}
            <div className="fixed bottom-0 left-0 right-0 bg-orange-500 dark:bg-orange-600 p-4 shadow-lg border-t-4 border-orange-600 dark:border-orange-700 z-40">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <button
                    className="text-white hover:text-orange-100"
                    data-testid="button-close-selection-panel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <h3 className="text-white font-bold text-lg">Select Players</h3>
                  <div className="w-5"></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => setShowBatsmanDialog(true)}
                    className="h-16 bg-white hover:bg-orange-50 text-orange-600 font-semibold text-base border-2 border-orange-200"
                    data-testid="button-select-batsman-panel"
                  >
                    Select Batsman
                  </Button>
                  <Button
                    onClick={() => setShowBowlerDialog(true)}
                    className="h-16 bg-white hover:bg-orange-50 text-orange-600 font-semibold text-base border-2 border-orange-200"
                    data-testid="button-select-bowler-panel"
                  >
                    Select Bowler
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Scorecard Tab - Original Full Scorecard */}
          <TabsContent value="scorecard" className="flex-1 mt-0">
            <div className="p-4 max-w-6xl mx-auto space-y-6">
              {/* Original scoring controls and full scorecard go here */}
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

      {/* Original Content Continues in Scorecard Tab */}
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
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2 font-medium text-sm w-2/5">Name</th>
                  <th className="text-center py-1 px-2 font-medium text-sm w-3/20">R</th>
                  <th className="text-center py-1 px-2 font-medium text-sm w-3/20">B</th>
                  <th className="text-center py-1 px-2 font-medium text-sm w-3/20">SR</th>
                  <th className="text-center py-1 px-2 font-medium text-sm w-3/20">4s</th>
                  <th className="text-center py-1 px-2 font-medium text-sm w-3/20">6s</th>
                </tr>
              </thead>
              <tbody>
                {/* Striker first */}
                <tr className="border-b bg-sky-50 dark:bg-slate-800" data-testid="striker-row">
                  <td className="py-1 px-2">
                    <div className="flex items-center space-x-1">
                      <span className="font-medium text-sm">
                        {matchState.strikeBatsman.name}
                      </span>
                      <Badge variant="default" className="text-xs px-1">*</Badge>
                    </div>
                  </td>
                  <td className="text-center py-1 px-2 font-medium text-xs" data-testid="striker-runs">
                    {getCurrentBatsmanStats(true).runs}
                  </td>
                  <td className="text-center py-1 px-2 text-xs" data-testid="striker-balls">
                    {getCurrentBatsmanStats(true).balls}
                  </td>
                  <td className="text-center py-1 px-2 text-xs" data-testid="striker-strike-rate">
                    {getCurrentBatsmanStats(true).strikeRate}
                  </td>
                  <td className="text-center py-1 px-2 text-xs" data-testid="striker-fours">
                    {getCurrentBatsmanStats(true).fours || 0}
                  </td>
                  <td className="text-center py-1 px-2 text-xs" data-testid="striker-sixes">
                    {getCurrentBatsmanStats(true).sixes || 0}
                  </td>
                </tr>
                {/* Non-striker second */}
                <tr data-testid="non-striker-row">
                  <td className="py-1 px-2">
                    <span className="font-medium text-sm">
                      {matchState.nonStrikeBatsman.name}
                    </span>
                  </td>
                  <td className="text-center py-1 px-2 font-medium text-xs" data-testid="non-striker-runs">
                    {getCurrentBatsmanStats(false).runs}
                  </td>
                  <td className="text-center py-1 px-2 text-xs" data-testid="non-striker-balls">
                    {getCurrentBatsmanStats(false).balls}
                  </td>
                  <td className="text-center py-1 px-2 text-xs" data-testid="non-striker-strike-rate">
                    {getCurrentBatsmanStats(false).strikeRate}
                  </td>
                  <td className="text-center py-1 px-2 text-xs" data-testid="non-striker-fours">
                    {getCurrentBatsmanStats(false).fours || 0}
                  </td>
                  <td className="text-center py-1 px-2 text-xs" data-testid="non-striker-sixes">
                    {getCurrentBatsmanStats(false).sixes || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Current Bowler */}
          <div>
            <h3 className="font-medium text-sm mb-2">Current Bowler</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 px-2 font-medium text-sm w-2/5">Name</th>
                    <th className="text-center py-1 px-2 font-medium text-sm w-3/20">Ov</th>
                    <th className="text-center py-1 px-2 font-medium text-sm w-3/20">R</th>
                    <th className="text-center py-1 px-2 font-medium text-sm w-3/20">W</th>
                    <th className="text-center py-1 px-2 font-medium text-sm w-3/20">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-testid="bowler-row">
                    <td className="py-1 px-2">
                      <span className="font-medium text-sm">
                        {matchState.currentBowler.name}
                      </span>
                    </td>
                    <td className="text-center py-1 px-2 font-medium text-xs" data-testid="bowler-overs">
                      {getCurrentBowlerStats().overs}
                    </td>
                    <td className="text-center py-1 px-2 text-xs" data-testid="bowler-runs">
                      {getCurrentBowlerStats().runs}
                    </td>
                    <td className="text-center py-1 px-2 text-xs" data-testid="bowler-wickets">
                      {getCurrentBowlerStats().wickets}
                    </td>
                    <td className="text-center py-1 px-2 text-xs" data-testid="bowler-economy">
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
                  <th className="text-left py-1 px-1 font-medium text-xs">Batsman</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">R</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">B</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">4s</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">6s</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">SR</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">Out</th>
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
                      <td className="py-1 px-1">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-xs">
                            {batsman.player.name}
                          </span>
                          {isStriker && <Badge variant="default" className="text-xs px-1">*</Badge>}
                          {isNonStriker && !isStriker && <Badge variant="secondary" className="text-xs px-1">•</Badge>}
                        </div>
                      </td>
                      <td className="text-center py-1 px-1 font-medium text-xs" data-testid={`batsman-runs-${index}`}>
                        {batsman.runs}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" data-testid={`batsman-balls-${index}`}>
                        {batsman.balls}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" data-testid={`batsman-fours-${index}`}>
                        {batsman.fours}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" data-testid={`batsman-sixes-${index}`}>
                        {batsman.sixes}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" data-testid={`batsman-sr-${index}`}>
                        {batsman.strikeRate.toFixed(1)}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" data-testid={`batsman-dismissal-${index}`}>
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
                  <td className="py-1 px-1 text-xs">Extras</td>
                  <td className="text-center py-1 px-1 text-xs" data-testid="extras-total">
                    {battingTeamScore.extras.wides + battingTeamScore.extras.noBalls + battingTeamScore.extras.byes + battingTeamScore.extras.legByes}
                  </td>
                  <td className="text-center py-1 px-1 text-xs" colSpan={5}>
                    (W {battingTeamScore.extras.wides}, NB {battingTeamScore.extras.noBalls}, B {battingTeamScore.extras.byes}, LB {battingTeamScore.extras.legByes})
                  </td>
                </tr>

                {/* Total runs row */}
                <tr className="border-b font-bold">
                  <td className="py-1 px-1 text-xs">Total</td>
                  <td className="text-center py-1 px-1 text-xs" data-testid="team-total-runs">
                    {battingTeamScore.runs}
                  </td>
                  <td className="text-center py-1 px-1 text-xs" colSpan={5}>
                    ({battingTeamScore.wickets} wkts, {formatOvers(battingTeamScore.balls)} ov)
                  </td>
                </tr>

                {/* Yet to bat count */}
                {(() => {
                  const yetToBatCount = battingTeamPlayers.length - batsmanStats.length;
                  return yetToBatCount > 0 ? (
                    <tr className="text-muted-foreground">
                      <td className="py-1 px-1 text-xs">Yet to bat</td>
                      <td className="text-center py-1 px-1 text-xs" data-testid="yet-to-bat-count">
                        {yetToBatCount}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" colSpan={5}>
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
                  <th className="text-left py-1 px-1 font-medium text-xs">Bowler</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">Ov</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">R</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">W</th>
                  <th className="text-center py-1 px-1 font-medium text-xs">Econ</th>
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
                      <td className="py-1 px-1">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-xs">
                            {bowler.player.name}
                          </span>
                          {isCurrentBowler && <Badge variant="default" className="text-xs px-1">•</Badge>}
                        </div>
                      </td>
                      <td className="text-center py-1 px-1 font-medium text-xs" data-testid={`bowler-overs-${index}`}>
                        {formatCricketOvers(bowler.overs)}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" data-testid={`bowler-runs-${index}`}>
                        {bowler.runs}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" data-testid={`bowler-wickets-${index}`}>
                        {bowler.wickets}
                      </td>
                      <td className="text-center py-1 px-1 text-xs" data-testid={`bowler-economy-${index}`}>
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
            </div>
          </TabsContent>
          
          {/* Other Tabs - Placeholders */}
          <TabsContent value="stats" className="flex-1 mt-0">
            <div className="p-4 max-w-6xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Match Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Detailed statistics will appear here during the match.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="super-stars" className="flex-1 mt-0">
            <div className="p-4 max-w-6xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Super Stars</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Top performers will be highlighted here.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="balls" className="flex-1 mt-0">
            <div className="p-4 max-w-6xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Ball by Ball</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Ball-by-ball commentary will be shown here.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="info" className="flex-1 mt-0">
            <div className="p-4 max-w-6xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Match Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Match details and information will be displayed here.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* All Dialogs Below */}
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
      <Dialog open={showBatsmanDialog} onOpenChange={setShowBatsmanDialog}>
        <DialogContent className="inset-0 h-screen w-screen max-w-none rounded-none p-0 md:max-w-2xl md:h-auto md:rounded-lg" aria-describedby="batsman-selection-description">
          <div className="flex min-h-screen flex-col md:min-h-0">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelBatsmanSelection}
                data-testid="button-close-batsman-dialog"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <div className="font-semibold text-lg">
                  {matchState?.currentInnings === 2 && batsmanStats.length === 0 
                    ? "Select Opening Batsman (Striker)"
                    : matchState?.currentInnings === 2 && batsmanStats.length === 1
                    ? "Select Opening Batsman (Non-Striker)" 
                    : "Select New Batsman"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {matchState?.currentInnings === 2 ? "Second Innings" : "First Innings"}
                </div>
              </div>
            </div>
            
            <DialogDescription id="batsman-selection-description" className="sr-only">
              Select a batsman from the available players below. Use the search to filter players, then tap to select and confirm your choice.
            </DialogDescription>

            {/* Search Bar */}
            <div className="border-b bg-background px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={batsmanSearchQuery}
                  onChange={(e) => setBatsmanSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-batsman"
                />
                {batsmanSearchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setBatsmanSearchQuery('')}
                    className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredBatsmen.map((player, index) => (
                  <Button
                    key={`${player.name}-${index}`}
                    onClick={() => setSelectedBatsman(player)}
                    variant={selectedBatsman?.name === player.name ? "default" : "outline"}
                    className={`h-16 p-4 text-left justify-start ${
                      selectedBatsman?.name === player.name 
                        ? "ring-2 ring-primary bg-primary/10 border-primary" 
                        : "hover:bg-accent/50"
                    }`}
                    data-testid={`button-select-batsman-${index}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{player.name}</div>
                        <div className="text-xs text-muted-foreground">Available</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              {filteredBatsmen.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">
                    {batsmanSearchQuery ? "No players found matching your search" : "No available batsmen"}
                  </div>
                  {batsmanSearchQuery && (
                    <Button 
                      variant="ghost" 
                      onClick={() => setBatsmanSearchQuery('')}
                      data-testid="button-clear-search-empty"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 border-t bg-background p-4 pb-[env(safe-area-inset-bottom)]">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={cancelBatsmanSelection}
                  className="flex-1"
                  data-testid="button-cancel-batsman"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmBatsmanSelection}
                  disabled={!selectedBatsman}
                  className="flex-1"
                  data-testid="button-confirm-batsman"
                >
                  {matchState?.currentInnings === 2 && batsmanStats.length === 0 
                    ? "Confirm Striker"
                    : matchState?.currentInnings === 2 && batsmanStats.length === 1
                    ? "Confirm Non-Striker" 
                    : "Confirm Selection"}
                </Button>
              </div>
              {selectedBatsman && (
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{selectedBatsman.name}</span>
                </div>
              )}
            </div>
          </div>
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
      <Dialog open={showBowlerDialog} onOpenChange={() => {}}>
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
        <DialogContent className="w-screen h-screen max-w-none max-h-none overflow-y-auto [&>button]:hidden" aria-describedby="innings-transition-description">
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
                    in {formatOvers(getTotalBallsFacedByBatsmen(firstInningsBatsmanStats))} overs
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
                  <CardContent className="max-h-64 overflow-y-auto">
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
                  <CardContent className="max-h-64 overflow-y-auto">
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
                    ({formatOvers(getTotalBallsFacedByBatsmen(firstInningsBatsmanStats))} ov)
                  </div>
                  <div>
                    Second Innings: {battingTeamScore.runs}/{battingTeamScore.wickets} 
                    ({formatOvers(getTotalBallsFacedByBatsmen(batsmanStats))} ov)
                  </div>
                  
                  {matchState.matchResult === 'second_team_wins' && (
                    <div className="text-green-600 font-medium mt-2">
                      Target of {matchState.target} reached with {(matchState.matchOvers * 6) - battingTeamScore.balls} balls remaining!
                    </div>
                  )}
                  
                  {matchState.matchResult === 'first_team_wins' && (
                    <div className="text-blue-600 font-medium mt-2">
                      {battingTeamScore.wickets >= getMaxWicketsForCurrentInnings() 
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
                
                <div className="flex justify-center gap-3 pt-4">
                  {matchSummaryId && (
                    <Button
                      variant="default"
                      onClick={() => {
                        setShowMatchResult(false);
                        setLocation(`/match-summary/${matchSummaryId}`);
                      }}
                      data-testid="button-view-match-summary"
                    >
                      📊 View Match Summary
                    </Button>
                  )}
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

      {/* Finalizing Match Loading Overlay */}
      {isFinalizing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow-xl">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-lg font-semibold mb-2">Finalizing Match...</div>
            <div className="text-sm text-muted-foreground">Calculating final results and saving match data</div>
          </div>
        </div>
      )}
    </div>
  );
}