import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Undo2, Plus, X, RotateCcw, Settings, Trophy, Users, Activity, Target, TrendingUp, Award, Minus, Volume2, VolumeX, Share2, ChevronDown } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useGuestPlayerSync } from '@/hooks/useGuestPlayerSync';

// Types
interface Player {
  id: string;
  name: string;
}

interface BatsmanStats {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType?: string;
  bowler?: string;
  fielder?: string;
}

interface BowlerStats {
  id: string;
  name: string;
  overs: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

interface TeamScore {
  runs: number;
  wickets: number;
  balls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
}

type DismissalType = 'bowled' | 'caught' | 'lbw' | 'stumped' | 'run_out' | 'hit_wicket';
type ExtraType = 'none' | 'wide' | 'noball' | 'bye' | 'legbye';

interface WicketEvent {
  type: DismissalType;
  dismissedBatsman: 'striker' | 'non-striker';
  dismissedAtEnd: 'striker-end' | 'non-striker-end';
  runsBeforeDismissal: number;
  fielder?: string;
}

interface BallEventRecord {
  ballNumber: number;
  overNumber: number;
  isLegal: boolean;
  completedRuns: number;
  automaticRuns: number;
  extraType: ExtraType;
  wicket: WicketEvent | null;
  strikerBefore: { id: string; name: string };
  nonStrikerBefore: { id: string; name: string };
  strikerAfter: { id: string; name: string };
  nonStrikerAfter: { id: string; name: string };
  isFreeHit: boolean;
  bowlerId: string;
  bowlerName: string;
  displayText: string;
}

interface MatchState {
  currentInnings: 1 | 2;
  team1Score: TeamScore;
  team2Score: TeamScore;
  team1Batting: BatsmanStats[];
  team2Batting: BatsmanStats[];
  team1Bowling: BowlerStats[];
  team2Bowling: BowlerStats[];
  strikeBatsman: { id: string; name: string };
  nonStrikeBatsman: { id: string; name: string };
  currentBowler: { id: string; name: string };
  currentOver: string[];
  matchOvers: number;
  team1BattingFirst: boolean;
  isMatchComplete: boolean;
  result?: string;
  target?: number;
  isFreeHit: boolean;
  ballHistory: BallEventRecord[];
}

// Storage keys
const STORAGE_KEYS = {
  MATCH_STATE: 'cricscorer_match_state',
  TEAM1_PLAYERS: 'cricscorer_team1_players',
  TEAM2_PLAYERS: 'cricscorer_team2_players',
  MATCH_CONFIG: 'cricscorer_match_config'
};

// Utility function to format overs from balls
const formatOvers = (balls: number): string => {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
};

// Initialize default match state
const createInitialMatchState = (overs: number = 20): MatchState => ({
  currentInnings: 1,
  team1Score: { runs: 0, wickets: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
  team2Score: { runs: 0, wickets: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
  team1Batting: [],
  team2Batting: [],
  team1Bowling: [],
  team2Bowling: [],
  strikeBatsman: { id: '', name: '' },
  nonStrikeBatsman: { id: '', name: '' },
  currentBowler: { id: '', name: '' },
  currentOver: [],
  matchOvers: overs,
  team1BattingFirst: true,
  isMatchComplete: false,
  isFreeHit: false,
  ballHistory: []
});

export default function Scoreboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { syncGuestPlayerToTeam } = useGuestPlayerSync();
  
  // Load players from localStorage
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);
  
  // Match state
  const [matchState, setMatchState] = useState<MatchState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MATCH_STATE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return createInitialMatchState();
      }
    }
    return createInitialMatchState();
  });

  // UI state
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showBatsmanSelectDialog, setShowBatsmanSelectDialog] = useState(false);
  const [showBowlerSelectDialog, setShowBowlerSelectDialog] = useState(false);
  const [showEndInningsDialog, setShowEndInningsDialog] = useState(false);
  const [showInlineExtras, setShowInlineExtras] = useState(false);
  const [showInlineWicket, setShowInlineWicket] = useState(false);
  const [wicketStep, setWicketStep] = useState<'how' | 'fielder' | 'runout_details'>('how');
  const [extrasType, setExtrasType] = useState<'wd' | 'nb' | 'b' | 'lb'>('wd');
  const [extrasRuns, setExtrasRuns] = useState(1);
  const [showMatchEndedDialog, setShowMatchEndedDialog] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  // Wicket dialog state
  const [selectedDismissalType, setSelectedDismissalType] = useState('');
  const [selectedFielder, setSelectedFielder] = useState('');
  const [dismissedBatsman, setDismissedBatsman] = useState<'striker' | 'non-striker'>('striker');
  const [runoutCompletedRuns, setRunoutCompletedRuns] = useState(0);
  const [runoutDismissedAtEnd, setRunoutDismissedAtEnd] = useState<'striker-end' | 'non-striker-end'>('striker-end');
  
  // Undo functionality
  const [undoStack, setUndoStack] = useState<MatchState[]>([]);
  
  // Initial player selection state
  const [selectedOpeningBatsmen, setSelectedOpeningBatsmen] = useState<Player[]>([]);
  const [selectedOpeningBowler, setSelectedOpeningBowler] = useState<Player | null>(null);
  const [showInitialBatsmanSelect, setShowInitialBatsmanSelect] = useState(false);
  const [showInitialBowlerSelect, setShowInitialBowlerSelect] = useState(false);
  const [isMatchStarted, setIsMatchStarted] = useState(false);
  
  // Guest player state
  const [guestBatsmanName, setGuestBatsmanName] = useState('');
  const [guestBowlerName, setGuestBowlerName] = useState('');
  
  // Check if match has already started (has any balls bowled)
  useEffect(() => {
    const totalBalls = matchState.team1Score.balls + matchState.team2Score.balls;
    if (totalBalls > 0) {
      setIsMatchStarted(true);
    }
  }, [matchState]);
  
  // Load players on mount
  useEffect(() => {
    const savedMatchData = localStorage.getItem('matchData');
    const savedConfig = localStorage.getItem(STORAGE_KEYS.MATCH_CONFIG);
    
    if (savedMatchData) {
      try {
        const matchData = JSON.parse(savedMatchData);
        const myPlayers = (matchData.myTeamPlayers || []).filter((p: Player) => p.name && p.name.trim() !== '');
        const opponentPlayers = (matchData.opponentTeamPlayers || []).filter((p: Player) => p.name && p.name.trim() !== '');
        setTeam1Players(myPlayers);
        setTeam2Players(opponentPlayers);
      } catch (e) {
        console.error('Error parsing match data:', e);
      }
    }
    
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.overs && !matchState.team1Score.balls && !matchState.team2Score.balls) {
          setMatchState(prev => ({ ...prev, matchOvers: config.overs }));
        }
      } catch (e) {
        console.error('Error parsing match config:', e);
      }
    }
  }, []);
  
  // Save match state whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MATCH_STATE, JSON.stringify(matchState));
  }, [matchState]);
  
  // Get current batting team players
  const battingTeamPlayers = useMemo(() => {
    if (matchState.currentInnings === 1) {
      return matchState.team1BattingFirst ? team1Players : team2Players;
    }
    return matchState.team1BattingFirst ? team2Players : team1Players;
  }, [matchState.currentInnings, matchState.team1BattingFirst, team1Players, team2Players]);
  
  // Get current bowling team players
  const bowlingTeamPlayers = useMemo(() => {
    if (matchState.currentInnings === 1) {
      return matchState.team1BattingFirst ? team2Players : team1Players;
    }
    return matchState.team1BattingFirst ? team1Players : team2Players;
  }, [matchState.currentInnings, matchState.team1BattingFirst, team1Players, team2Players]);
  
  // Get current batting team score
  const battingTeamScore = useMemo(() => {
    if (matchState.currentInnings === 1) {
      return matchState.team1BattingFirst ? matchState.team1Score : matchState.team2Score;
    }
    return matchState.team1BattingFirst ? matchState.team2Score : matchState.team1Score;
  }, [matchState]);
  
  // Get batting stats for current innings
  const currentBattingStats = useMemo(() => {
    if (matchState.currentInnings === 1) {
      return matchState.team1BattingFirst ? matchState.team1Batting : matchState.team2Batting;
    }
    return matchState.team1BattingFirst ? matchState.team2Batting : matchState.team1Batting;
  }, [matchState]);
  
  // Get bowling stats for current innings
  const currentBowlingStats = useMemo(() => {
    if (matchState.currentInnings === 1) {
      return matchState.team1BattingFirst ? matchState.team2Bowling : matchState.team1Bowling;
    }
    return matchState.team1BattingFirst ? matchState.team1Bowling : matchState.team2Bowling;
  }, [matchState]);
  
  // Get current batsman stats
  const getCurrentBatsmanStats = useCallback((isStriker: boolean) => {
    const batsman = isStriker ? matchState.strikeBatsman : matchState.nonStrikeBatsman;
    if (!batsman.id) return { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
    
    const stats = currentBattingStats.find(b => b.id === batsman.id);
    return stats || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
  }, [matchState.strikeBatsman, matchState.nonStrikeBatsman, currentBattingStats]);
  
    // Get batsman stats by ID
    const getBatsmanStatsById = useCallback((id: string) => {
      if (!id) return { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
      const stats = currentBattingStats.find(b => b.id === id);
      return stats || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
    }, [currentBattingStats]);

    // Get current bowler stats
  const getCurrentBowlerStats = useCallback(() => {
    if (!matchState.currentBowler.id) return { overs: '0.0', balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 };
    
    const stats = currentBowlingStats.find(b => b.id === matchState.currentBowler.id);
    return stats || { overs: '0.0', balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 };
  }, [matchState.currentBowler.id, currentBowlingStats]);
  
  // Save state for undo
  const saveStateForUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(matchState))]);
  }, [matchState]);
  
  // Handle undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setMatchState(previousState);
    setUndoStack(prev => prev.slice(0, -1));
    
    toast({
      title: "Undone",
      description: "Last action has been undone"
    });
  }, [undoStack, toast]);
  
  // Rotate strike
  const rotateStrike = useCallback(() => {
    setMatchState(prev => ({
      ...prev,
      strikeBatsman: prev.nonStrikeBatsman,
      nonStrikeBatsman: prev.strikeBatsman
    }));
  }, []);
  
  // Update batsman stats
  const updateBatsmanStats = useCallback((batsmanId: string, runs: number, isBoundary: boolean = false) => {
    const updateFn = (stats: BatsmanStats[]): BatsmanStats[] => {
      const existingIndex = stats.findIndex(b => b.id === batsmanId);
      const batsman = battingTeamPlayers.find(p => p.id === batsmanId);
      
      if (existingIndex >= 0) {
        const updated = [...stats];
        updated[existingIndex] = {
          ...updated[existingIndex],
          runs: updated[existingIndex].runs + runs,
          balls: updated[existingIndex].balls + 1,
          fours: updated[existingIndex].fours + (runs === 4 && isBoundary ? 1 : 0),
          sixes: updated[existingIndex].sixes + (runs === 6 && isBoundary ? 1 : 0),
          strikeRate: ((updated[existingIndex].runs + runs) / (updated[existingIndex].balls + 1)) * 100
        };
        return updated;
      } else if (batsman) {
        return [...stats, {
          id: batsmanId,
          name: batsman.name,
          runs,
          balls: 1,
          fours: runs === 4 && isBoundary ? 1 : 0,
          sixes: runs === 6 && isBoundary ? 1 : 0,
          strikeRate: runs * 100,
          isOut: false
        }];
      }
      return stats;
    };
    
    setMatchState(prev => {
      if (prev.currentInnings === 1) {
        if (prev.team1BattingFirst) {
          return { ...prev, team1Batting: updateFn(prev.team1Batting) };
        } else {
          return { ...prev, team2Batting: updateFn(prev.team2Batting) };
        }
      } else {
        if (prev.team1BattingFirst) {
          return { ...prev, team2Batting: updateFn(prev.team2Batting) };
        } else {
          return { ...prev, team1Batting: updateFn(prev.team1Batting) };
        }
      }
    });
  }, [battingTeamPlayers]);
  
  // Update bowler stats
  const updateBowlerStats = useCallback((bowlerId: string, runs: number, isWicket: boolean = false, isExtra: boolean = false, extraType?: string) => {
    const updateFn = (stats: BowlerStats[]): BowlerStats[] => {
      const existingIndex = stats.findIndex(b => b.id === bowlerId);
      const bowler = bowlingTeamPlayers.find(p => p.id === bowlerId);
      
      const ballIncrement = isExtra && (extraType === 'wide' || extraType === 'noball') ? 0 : 1;
      
      if (existingIndex >= 0) {
        const updated = [...stats];
        const newBalls = updated[existingIndex].balls + ballIncrement;
        const newOvers = formatOvers(newBalls);
        const newRuns = updated[existingIndex].runs + runs;
        const newWickets = updated[existingIndex].wickets + (isWicket ? 1 : 0);
        
        updated[existingIndex] = {
          ...updated[existingIndex],
          balls: newBalls,
          overs: newOvers,
          runs: newRuns,
          wickets: newWickets,
          economy: newBalls > 0 ? (newRuns / (newBalls / 6)) : 0,
          wides: updated[existingIndex].wides + (extraType === 'wide' ? 1 : 0),
          noBalls: updated[existingIndex].noBalls + (extraType === 'noball' ? 1 : 0)
        };
        return updated;
      } else if (bowler) {
        return [...stats, {
          id: bowlerId,
          name: bowler.name,
          balls: ballIncrement,
          overs: formatOvers(ballIncrement),
          maidens: 0,
          runs,
          wickets: isWicket ? 1 : 0,
          economy: ballIncrement > 0 ? (runs / (ballIncrement / 6)) : 0,
          wides: extraType === 'wide' ? 1 : 0,
          noBalls: extraType === 'noball' ? 1 : 0
        }];
      }
      return stats;
    };
    
    setMatchState(prev => {
      if (prev.currentInnings === 1) {
        if (prev.team1BattingFirst) {
          return { ...prev, team2Bowling: updateFn(prev.team2Bowling) };
        } else {
          return { ...prev, team1Bowling: updateFn(prev.team1Bowling) };
        }
      } else {
        if (prev.team1BattingFirst) {
          return { ...prev, team1Bowling: updateFn(prev.team1Bowling) };
        } else {
          return { ...prev, team2Bowling: updateFn(prev.team2Bowling) };
        }
        }
      });
    }, [bowlingTeamPlayers]);
  
  // Get max wickets based on team size
  const getMaxWickets = useCallback(() => {
    return Math.max(battingTeamPlayers.length - 1, 1);
  }, [battingTeamPlayers]);
  
  // Handle match end
  const handleMatchEnd = useCallback((reason: 'chase' | 'complete') => {
    let result = '';
    
    const team1Runs = matchState.team1Score.runs;
    const team2Runs = matchState.team2Score.runs;
    const team1Name = localStorage.getItem('myTeamName') || 'Team 1';
    const team2Name = localStorage.getItem('opponentTeamName') || 'Team 2';
    
    if (team1Runs > team2Runs) {
      const margin = matchState.team1BattingFirst 
        ? team1Runs - team2Runs 
        : getMaxWickets() - matchState.team1Score.wickets;
      result = matchState.team1BattingFirst 
        ? `${team1Name} won by ${team1Runs - team2Runs} runs`
        : `${team1Name} won by ${margin} wickets`;
    } else if (team2Runs > team1Runs) {
      const margin = matchState.team1BattingFirst 
        ? getMaxWickets() - matchState.team2Score.wickets 
        : team2Runs - team1Runs;
      result = matchState.team1BattingFirst 
        ? `${team2Name} won by ${margin} wickets`
        : `${team2Name} won by ${team2Runs - team1Runs} runs`;
    } else {
      result = 'Match Tied';
    }
    
    setMatchState(prev => ({
      ...prev,
      isMatchComplete: true,
      result
    }));
    
    setShowMatchEndedDialog(true);
  }, [matchState, getMaxWickets]);
  
  // Handle innings end
  const handleInningsEnd = useCallback(() => {
    const firstInningsScore = battingTeamScore.runs;
    
    setMatchState(prev => ({
      ...prev,
      currentInnings: 2,
      target: firstInningsScore + 1,
      strikeBatsman: { id: '', name: '' },
      nonStrikeBatsman: { id: '', name: '' },
      currentBowler: { id: '', name: '' },
      currentOver: [],
      isFreeHit: false,
      ballHistory: []
    }));
    
    setIsMatchStarted(false);
    setSelectedOpeningBatsmen([]);
    setSelectedOpeningBowler(null);
    setShowEndInningsDialog(false);
    
    toast({
      title: "Innings Complete",
      description: `Target: ${firstInningsScore + 1} runs`
    });
  }, [battingTeamScore, toast]);

  // Check if innings is complete
  const checkInningsComplete = useCallback((runs: number, wickets: number, balls: number) => {
    const maxWickets = getMaxWickets();
    const maxBalls = matchState.matchOvers * 6;
    
    // Check for target chased in 2nd innings
    if (matchState.currentInnings === 2 && matchState.target) {
      if (runs >= matchState.target) {
        handleMatchEnd('chase');
        return true;
      }
    }
    
    // All out or overs complete
    if (wickets >= maxWickets || balls >= maxBalls) {
      if (matchState.currentInnings === 1) {
        setShowEndInningsDialog(true);
      } else {
        handleMatchEnd('complete');
      }
      return true;
    }
    
    return false;
  }, [matchState, getMaxWickets, handleMatchEnd]);

  /**
   * MASTER BALL PROCESSING FUNCTION
   * Implements the cricket scoring logic in the correct order:
   * 1. Determine if ball is legal
   * 2. Determine completed runs
   * 3. Apply strike rotation due to runs (completed runs only, NOT auto extras)
   * 4. Resolve wicket positioning (if any)
   * 5. Increment legal ball count (if legal)
   * 6. If over completes → swap strike
   * 7. Set free hit flag if no-ball
   */
  const processBall = useCallback((params: {
    completedRuns: number;
    extraType: ExtraType;
    wicket: WicketEvent | null;
    isBoundary?: boolean;
  }) => {
    const { completedRuns, extraType, wicket, isBoundary = false } = params;
    
    if (!matchState.strikeBatsman.id || !matchState.currentBowler.id) {
      toast({
        title: "Select Players",
        description: "Please select batsmen and bowler first",
        variant: "destructive"
      });
      return;
    }
    
    saveStateForUndo();
    
    if (!isMatchStarted) {
      setIsMatchStarted(true);
    }
    
    // Step 1: Determine ball legality
    const isLegal = extraType !== 'wide' && extraType !== 'noball';
    const automaticRuns = (extraType === 'wide' || extraType === 'noball') ? 1 : 0;
    const totalRuns = completedRuns + automaticRuns;
    
    // Store current state for ball history
    const strikerBefore = { ...matchState.strikeBatsman };
    const nonStrikerBefore = { ...matchState.nonStrikeBatsman };
    const currentOverNumber = Math.floor(battingTeamScore.balls / 6);
    const currentBallNumber = battingTeamScore.balls % 6;
    const wasFreeHit = matchState.isFreeHit;
    
    // Calculate new positions
    let newStriker = { ...matchState.strikeBatsman };
    let newNonStriker = { ...matchState.nonStrikeBatsman };
    let shouldShowBowlerSelect = false;
    let newBalls = battingTeamScore.balls;
    
    // Step 2 & 3: Apply strike rotation from COMPLETED runs only
    // Automatic extra runs (wide/no-ball penalty) NEVER affect strike
    if (completedRuns % 2 === 1) {
      const temp = newStriker;
      newStriker = newNonStriker;
      newNonStriker = temp;
    }
    
    // Step 4: Resolve wicket positioning
    if (wicket) {
      // Validate free hit dismissals - only run-out allowed on free hit
      if (wasFreeHit && wicket.type !== 'run_out') {
        toast({
          title: "Invalid Dismissal",
          description: "Only run-out is allowed on a free hit",
          variant: "destructive"
        });
        return;
      }
      
      // For run-out, positioning depends on dismissedAtEnd
      if (wicket.type === 'run_out') {
        // After runs are applied, determine who is at which end
        // dismissedAtEnd tells us which physical end the batsman was dismissed at
        if (wicket.dismissedAtEnd === 'striker-end') {
          // Batsman dismissed at striker's end - new batsman will face
          // Check who ended up at striker's end after runs
          newStriker = { id: '', name: '' };
        } else {
          // Batsman dismissed at non-striker's end
          newNonStriker = { id: '', name: '' };
        }
      } else {
        // For non-run-out dismissals (bowled, caught, lbw, stumped, hit wicket)
        // The striker is always out, new batsman takes striker position
        newStriker = { id: '', name: '' };
      }
    }
    
    // Step 5: Increment ball count only if legal
    if (isLegal) {
      newBalls = battingTeamScore.balls + 1;
    }
    
    // Step 6: Check over complete → swap strike (only after legal balls)
    const isOverComplete = isLegal && newBalls % 6 === 0;
    if (isOverComplete && newBalls < matchState.matchOvers * 6) {
      // End-of-over strike swap
      const temp = newStriker;
      newStriker = newNonStriker;
      newNonStriker = temp;
      shouldShowBowlerSelect = true;
    }
    
    // Step 7: Set free hit flag for next ball if no-ball
    const nextIsFreeHit = extraType === 'noball';
    
      // Calculate batsman stats update parameters
      const batsmanFacedBall = extraType !== 'wide';
      const batsmanRuns = (extraType === 'bye' || extraType === 'legbye') ? 0 : completedRuns;
      const shouldUpdateBatsman = batsmanFacedBall;
      
      // Calculate bowler stats update parameters
      const bowlerConcededRuns = extraType === 'bye' || extraType === 'legbye' ? 0 : totalRuns;
      const isWicketForBowler = wicket !== null && wicket.type !== 'run_out';
      const ballIncrement = isLegal ? 1 : 0;
    
    // Generate display text for current over
    let displayText = '';
    if (wicket) {
      displayText = 'W';
    } else if (extraType === 'wide') {
      displayText = completedRuns > 0 ? `Wd+${completedRuns}` : 'Wd';
    } else if (extraType === 'noball') {
      displayText = completedRuns > 0 ? `Nb+${completedRuns}` : 'Nb';
    } else if (extraType === 'bye') {
      displayText = `B${completedRuns}`;
    } else if (extraType === 'legbye') {
      displayText = `Lb${completedRuns}`;
    } else {
      displayText = completedRuns.toString();
    }
    
    // Create ball event record for history/undo
    const ballEvent: BallEventRecord = {
      ballNumber: currentBallNumber,
      overNumber: currentOverNumber,
      isLegal,
      completedRuns,
      automaticRuns,
      extraType,
      wicket,
      strikerBefore,
      nonStrikerBefore,
      strikerAfter: newStriker,
      nonStrikerAfter: newNonStriker,
      isFreeHit: wasFreeHit,
      bowlerId: matchState.currentBowler.id,
      bowlerName: matchState.currentBowler.name,
      displayText
    };
    
    // Update match state - consolidated to avoid race conditions
    setMatchState(prev => {
      const scoreKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Score' : 'team2Score')
        : (prev.team1BattingFirst ? 'team2Score' : 'team1Score');
      
      const battingKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Batting' : 'team2Batting')
        : (prev.team1BattingFirst ? 'team2Batting' : 'team1Batting');
      
      const bowlingKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team2Bowling' : 'team1Bowling')
        : (prev.team1BattingFirst ? 'team1Bowling' : 'team2Bowling');
      
      const extrasKey = extraType === 'wide' ? 'wides' : 
                        extraType === 'noball' ? 'noBalls' : 
                        extraType === 'bye' ? 'byes' : 
                        extraType === 'legbye' ? 'legByes' : null;
      
      const newExtras = extrasKey ? {
        ...prev[scoreKey].extras,
        [extrasKey]: prev[scoreKey].extras[extrasKey] + (extraType === 'noball' ? automaticRuns : totalRuns)
      } : prev[scoreKey].extras;
      
      const newCurrentOver = isOverComplete ? [] : 
        (isLegal ? [...prev.currentOver, displayText] : [...prev.currentOver, displayText]);
      
      // Update batsman stats inline - use strikerBefore.id (who actually faced the ball)
      let updatedBatting = prev[battingKey] as BatsmanStats[];
      if (shouldUpdateBatsman) {
        const existingBatsmanIndex = updatedBatting.findIndex(b => b.id === strikerBefore.id);
        const batsman = battingTeamPlayers.find(p => p.id === strikerBefore.id);
        
        if (existingBatsmanIndex >= 0) {
          updatedBatting = [...updatedBatting];
          updatedBatting[existingBatsmanIndex] = {
            ...updatedBatting[existingBatsmanIndex],
            runs: updatedBatting[existingBatsmanIndex].runs + batsmanRuns,
            balls: updatedBatting[existingBatsmanIndex].balls + 1,
            fours: updatedBatting[existingBatsmanIndex].fours + (batsmanRuns === 4 && isBoundary ? 1 : 0),
            sixes: updatedBatting[existingBatsmanIndex].sixes + (batsmanRuns === 6 && isBoundary ? 1 : 0),
            strikeRate: ((updatedBatting[existingBatsmanIndex].runs + batsmanRuns) / (updatedBatting[existingBatsmanIndex].balls + 1)) * 100
          };
        } else if (batsman) {
          updatedBatting = [...updatedBatting, {
            id: strikerBefore.id,
            name: batsman.name,
            runs: batsmanRuns,
            balls: 1,
            fours: batsmanRuns === 4 && isBoundary ? 1 : 0,
            sixes: batsmanRuns === 6 && isBoundary ? 1 : 0,
            strikeRate: batsmanRuns * 100,
            isOut: false
          }];
        }
      }
      
      // Update bowler stats inline
      let updatedBowling = prev[bowlingKey] as BowlerStats[];
      const existingBowlerIndex = updatedBowling.findIndex(b => b.id === matchState.currentBowler.id);
      const bowler = bowlingTeamPlayers.find(p => p.id === matchState.currentBowler.id);
      
      const formatOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;
      
      if (existingBowlerIndex >= 0) {
        updatedBowling = [...updatedBowling];
        const currentBowler = updatedBowling[existingBowlerIndex];
        const newBowlerBalls = currentBowler.balls + ballIncrement;
        const newBowlerRuns = currentBowler.runs + bowlerConcededRuns;
        updatedBowling[existingBowlerIndex] = {
          ...currentBowler,
          balls: newBowlerBalls,
          overs: formatOvers(newBowlerBalls),
          runs: newBowlerRuns,
          wickets: currentBowler.wickets + (isWicketForBowler ? 1 : 0),
          economy: newBowlerBalls > 0 ? (newBowlerRuns / (newBowlerBalls / 6)) : 0,
          wides: currentBowler.wides + (extraType === 'wide' ? 1 : 0),
          noBalls: currentBowler.noBalls + (extraType === 'noball' ? 1 : 0)
        };
      } else if (bowler) {
        updatedBowling = [...updatedBowling, {
          id: matchState.currentBowler.id,
          name: bowler.name,
          balls: ballIncrement,
          overs: formatOvers(ballIncrement),
          maidens: 0,
          runs: bowlerConcededRuns,
          wickets: isWicketForBowler ? 1 : 0,
          economy: ballIncrement > 0 ? (bowlerConcededRuns / (ballIncrement / 6)) : 0,
          wides: extraType === 'wide' ? 1 : 0,
          noBalls: extraType === 'noball' ? 1 : 0
        }];
      }
      
      return {
        ...prev,
        [scoreKey]: {
          ...prev[scoreKey],
          runs: prev[scoreKey].runs + totalRuns,
          balls: newBalls,
          wickets: prev[scoreKey].wickets + (wicket ? 1 : 0),
          extras: extrasKey ? newExtras : prev[scoreKey].extras
        },
        [battingKey]: updatedBatting,
        [bowlingKey]: updatedBowling,
        currentOver: newCurrentOver,
        strikeBatsman: newStriker,
        nonStrikeBatsman: newNonStriker,
        isFreeHit: nextIsFreeHit,
        ballHistory: [...prev.ballHistory, ballEvent]
      };
    });
    
    // Check for innings complete
    const newWickets = battingTeamScore.wickets + (wicket ? 1 : 0);
    const newRuns = battingTeamScore.runs + totalRuns;
    const inningsComplete = checkInningsComplete(newRuns, newWickets, newBalls);
    
    if (!inningsComplete) {
      // Show dialogs as needed
      if (wicket && newWickets < getMaxWickets()) {
        setTimeout(() => setShowBatsmanSelectDialog(true), 100);
      } else if (shouldShowBowlerSelect) {
        setTimeout(() => setShowBowlerSelectDialog(true), 100);
      }
    }
    
  }, [matchState, saveStateForUndo, battingTeamScore, battingTeamPlayers, bowlingTeamPlayers, isMatchStarted, toast, checkInningsComplete, getMaxWickets]);

  // Handle run scored (wrapper for processBall)
  const handleRunScored = useCallback((runs: number) => {
    const isBoundary = runs === 4 || runs === 6;
    processBall({
      completedRuns: runs,
      extraType: 'none',
      wicket: null,
      isBoundary
    });
  }, [processBall]);
  
  // Handle extras - uses processBall for consistent logic
  const handleExtras = useCallback((type: 'wd' | 'nb' | 'b' | 'lb', runs: number) => {
    const extraType: ExtraType = type === 'wd' ? 'wide' : type === 'nb' ? 'noball' : type === 'b' ? 'bye' : 'legbye';
    
    processBall({
      completedRuns: runs,
      extraType,
      wicket: null,
      isBoundary: false
    });
    
    setShowInlineExtras(false);
  }, [processBall]);
  
  // Handle wicket - uses processBall for consistent logic
  const handleWicket = useCallback(() => {
    if (!matchState.strikeBatsman.id || !matchState.currentBowler.id) {
      toast({
        title: "Select Players",
        description: "Please select batsmen and bowler first",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedDismissalType) {
      toast({
        title: "Select Dismissal Type",
        description: "Please select how the batsman was dismissed",
        variant: "destructive"
      });
      return;
    }
    
    const dismissedId = dismissedBatsman === 'striker' 
      ? matchState.strikeBatsman.id 
      : matchState.nonStrikeBatsman.id;
    
    // Mark batsman as out in batting stats
    setMatchState(prev => {
      const battingKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Batting' : 'team2Batting')
        : (prev.team1BattingFirst ? 'team2Batting' : 'team1Batting');
      
      return {
        ...prev,
        [battingKey]: prev[battingKey].map((b: BatsmanStats) => {
          if (b.id === dismissedId) {
            return {
              ...b,
              isOut: true,
              dismissalType: selectedDismissalType,
              bowler: matchState.currentBowler.name,
              fielder: selectedFielder || undefined
            };
          }
          return b;
        })
      };
    });
    
    // Create wicket event
    const wicketEvent: WicketEvent = {
      type: selectedDismissalType as DismissalType,
      dismissedBatsman,
      dismissedAtEnd: selectedDismissalType === 'run_out' ? runoutDismissedAtEnd : 'striker-end',
      runsBeforeDismissal: selectedDismissalType === 'run_out' ? runoutCompletedRuns : 0,
      fielder: selectedFielder || undefined
    };
    
    // Use processBall for consistent logic
    processBall({
      completedRuns: selectedDismissalType === 'run_out' ? runoutCompletedRuns : 0,
      extraType: 'none',
      wicket: wicketEvent,
      isBoundary: false
    });
    
    // Reset dialog and inline state
    setShowWicketDialog(false);
    setShowInlineWicket(false);
    setWicketStep('how');
    setSelectedDismissalType('');
    setSelectedFielder('');
    setDismissedBatsman('striker');
    setRunoutCompletedRuns(0);
    setRunoutDismissedAtEnd('striker-end');
    
  }, [matchState, selectedDismissalType, selectedFielder, dismissedBatsman, runoutCompletedRuns, runoutDismissedAtEnd, processBall, toast]);
  
  // Handle inline wicket submission
  const handleInlineWicketSubmit = useCallback((type?: string, fielder?: string) => {
    const dType = type || selectedDismissalType;
    const fName = fielder || selectedFielder;
    
    if (!dType) return;
    
    const dismissedId = dismissedBatsman === 'striker' 
      ? matchState.strikeBatsman.id 
      : matchState.nonStrikeBatsman.id;
      
    // Create wicket event
    const wicketEvent: WicketEvent = {
      type: dType as DismissalType,
      dismissedBatsman,
      dismissedAtEnd: dType === 'run_out' ? runoutDismissedAtEnd : 'striker-end',
      runsBeforeDismissal: dType === 'run_out' ? runoutCompletedRuns : 0,
      fielder: fName || undefined
    };
    
    // Mark batsman as out
    setMatchState(prev => {
      const battingKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Batting' : 'team2Batting')
        : (prev.team1BattingFirst ? 'team2Batting' : 'team1Batting');
      
      return {
        ...prev,
        [battingKey]: prev[battingKey].map((b: BatsmanStats) => {
          if (b.id === dismissedId) {
            return {
              ...b,
              isOut: true,
              dismissalType: dType,
              bowler: prev.currentBowler.name,
              fielder: fName || undefined
            };
          }
          return b;
        })
      };
    });
    
    processBall({
      completedRuns: dType === 'run_out' ? runoutCompletedRuns : 0,
      extraType: 'none',
      wicket: wicketEvent,
      isBoundary: false
    });
    
    setShowInlineWicket(false);
    setWicketStep('how');
    setSelectedDismissalType('');
    setSelectedFielder('');
    setDismissedBatsman('striker');
    setRunoutCompletedRuns(0);
  }, [matchState, selectedDismissalType, selectedFielder, dismissedBatsman, runoutCompletedRuns, runoutDismissedAtEnd, processBall]);
  
  // Select new batsman
  const handleSelectBatsman = useCallback((player: Player) => {
    // Check if batsman has already batted and is out
    const hasAlreadyBatted = currentBattingStats.find(b => b.id === player.id && b.isOut);
    if (hasAlreadyBatted) {
      toast({
        title: "Invalid Selection",
        description: "This batsman has already been dismissed",
        variant: "destructive"
      });
      return;
    }
    
    // Check if batsman is currently at crease
    if (player.id === matchState.strikeBatsman.id || player.id === matchState.nonStrikeBatsman.id) {
      toast({
        title: "Invalid Selection",
        description: "This batsman is already at the crease",
        variant: "destructive"
      });
      return;
    }
    
    // Add batsman to batting stats if not exists
    const existsInStats = currentBattingStats.find(b => b.id === player.id);
    if (!existsInStats) {
      setMatchState(prev => {
        const battingKey = prev.currentInnings === 1
          ? (prev.team1BattingFirst ? 'team1Batting' : 'team2Batting')
          : (prev.team1BattingFirst ? 'team2Batting' : 'team1Batting');
        
        return {
          ...prev,
          [battingKey]: [...prev[battingKey], {
            id: player.id,
            name: player.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false
          }]
        };
      });
    }
    
    // Set as striker or non-striker
    if (!matchState.strikeBatsman.id) {
      setMatchState(prev => ({
        ...prev,
        strikeBatsman: { id: player.id, name: player.name }
      }));
    } else if (!matchState.nonStrikeBatsman.id) {
      setMatchState(prev => ({
        ...prev,
        nonStrikeBatsman: { id: player.id, name: player.name }
      }));
    }
    
    setShowBatsmanSelectDialog(false);
  }, [matchState, currentBattingStats, toast]);
  
  // Select bowler
  const handleSelectBowler = useCallback((player: Player) => {
    // Add bowler to bowling stats if not exists
    const existsInStats = currentBowlingStats.find(b => b.id === player.id);
    if (!existsInStats) {
      setMatchState(prev => {
        const bowlingKey = prev.currentInnings === 1
          ? (prev.team1BattingFirst ? 'team2Bowling' : 'team1Bowling')
          : (prev.team1BattingFirst ? 'team1Bowling' : 'team2Bowling');
        
        return {
          ...prev,
          [bowlingKey]: [...prev[bowlingKey], {
            id: player.id,
            name: player.name,
            balls: 0,
            overs: '0.0',
            maidens: 0,
            runs: 0,
            wickets: 0,
            economy: 0,
            wides: 0,
            noBalls: 0
          }]
        };
      });
    }
    
    setMatchState(prev => ({
      ...prev,
      currentBowler: { id: player.id, name: player.name }
    }));
    
    setShowBowlerSelectDialog(false);
  }, [currentBowlingStats]);
  
  // Add guest batsman to team
  const handleAddGuestBatsman = useCallback(async () => {
    if (!guestBatsmanName.trim()) {
      toast({
        title: "Enter Name",
        description: "Please enter a name for the guest player",
        variant: "destructive"
      });
      return;
    }
    
    const newPlayer: Player = {
      id: `guest-bat-${Date.now()}`,
      name: guestBatsmanName.trim()
    };
    
    // Determine which team the batsman belongs to and get team ID
    let teamId: string | null = null;
    if (matchState.currentInnings === 1) {
      if (matchState.team1BattingFirst) {
        setTeam1Players(prev => [...prev, newPlayer]);
        teamId = localStorage.getItem('myTeamId');
      } else {
        setTeam2Players(prev => [...prev, newPlayer]);
        teamId = localStorage.getItem('opponentTeamId');
      }
    } else {
      if (matchState.team1BattingFirst) {
        setTeam2Players(prev => [...prev, newPlayer]);
        teamId = localStorage.getItem('opponentTeamId');
      } else {
        setTeam1Players(prev => [...prev, newPlayer]);
        teamId = localStorage.getItem('myTeamId');
      }
    }
    
    // Update localStorage
    const savedMatchData = localStorage.getItem('matchData');
    if (savedMatchData) {
      try {
        const matchData = JSON.parse(savedMatchData);
        if (matchState.currentInnings === 1) {
          if (matchState.team1BattingFirst) {
            matchData.myTeamPlayers = [...(matchData.myTeamPlayers || []), newPlayer];
          } else {
            matchData.opponentTeamPlayers = [...(matchData.opponentTeamPlayers || []), newPlayer];
          }
        } else {
          if (matchState.team1BattingFirst) {
            matchData.opponentTeamPlayers = [...(matchData.opponentTeamPlayers || []), newPlayer];
          } else {
            matchData.myTeamPlayers = [...(matchData.myTeamPlayers || []), newPlayer];
          }
        }
        localStorage.setItem('matchData', JSON.stringify(matchData));
      } catch (e) {
        console.error('Error updating match data:', e);
      }
    }
    
    // Sync guest player to team database
    if (teamId) {
      await syncGuestPlayerToTeam(teamId, newPlayer.name, 'batsman');
    }
    
    setGuestBatsmanName('');
    toast({
      title: "Player Added",
      description: `${newPlayer.name} has been added to the team`
    });
  }, [guestBatsmanName, matchState.currentInnings, matchState.team1BattingFirst, toast, syncGuestPlayerToTeam]);
  
  // Add guest bowler to team
  const handleAddGuestBowler = useCallback(async () => {
    if (!guestBowlerName.trim()) {
      toast({
        title: "Enter Name",
        description: "Please enter a name for the guest player",
        variant: "destructive"
      });
      return;
    }
    
    const newPlayer: Player = {
      id: `guest-bowl-${Date.now()}`,
      name: guestBowlerName.trim()
    };
    
    // Determine which team the bowler belongs to and get team ID
    let teamId: string | null = null;
    if (matchState.currentInnings === 1) {
      if (matchState.team1BattingFirst) {
        setTeam2Players(prev => [...prev, newPlayer]);
        teamId = localStorage.getItem('opponentTeamId');
      } else {
        setTeam1Players(prev => [...prev, newPlayer]);
        teamId = localStorage.getItem('myTeamId');
      }
    } else {
      if (matchState.team1BattingFirst) {
        setTeam1Players(prev => [...prev, newPlayer]);
        teamId = localStorage.getItem('myTeamId');
      } else {
        setTeam2Players(prev => [...prev, newPlayer]);
        teamId = localStorage.getItem('opponentTeamId');
      }
    }
    
    // Update localStorage
    const savedMatchData = localStorage.getItem('matchData');
    if (savedMatchData) {
      try {
        const matchData = JSON.parse(savedMatchData);
        if (matchState.currentInnings === 1) {
          if (matchState.team1BattingFirst) {
            matchData.opponentTeamPlayers = [...(matchData.opponentTeamPlayers || []), newPlayer];
          } else {
            matchData.myTeamPlayers = [...(matchData.myTeamPlayers || []), newPlayer];
          }
        } else {
          if (matchState.team1BattingFirst) {
            matchData.myTeamPlayers = [...(matchData.myTeamPlayers || []), newPlayer];
          } else {
            matchData.opponentTeamPlayers = [...(matchData.opponentTeamPlayers || []), newPlayer];
          }
        }
        localStorage.setItem('matchData', JSON.stringify(matchData));
      } catch (e) {
        console.error('Error updating match data:', e);
      }
    }
    
    // Sync guest player to team database
    if (teamId) {
      await syncGuestPlayerToTeam(teamId, newPlayer.name, 'bowler');
    }
    
    setGuestBowlerName('');
    toast({
      title: "Player Added",
      description: `${newPlayer.name} has been added to the team`
    });
  }, [guestBowlerName, matchState.currentInnings, matchState.team1BattingFirst, toast, syncGuestPlayerToTeam]);

  // Handle opening batsmen selection
  const handleSelectOpeningBatsman = useCallback((player: Player) => {
    const isAlreadySelected = selectedOpeningBatsmen.find(p => p.id === player.id);
    
    if (isAlreadySelected) {
      // Deselect - remove from list
      setSelectedOpeningBatsmen(prev => prev.filter(p => p.id !== player.id));
      return;
    }
    
    if (selectedOpeningBatsmen.length >= 2) {
      toast({
        title: "Selection Full",
        description: "You can only select 2 opening batsmen. Deselect one first.",
        variant: "destructive"
      });
      return;
    }
    
    const newSelected = [...selectedOpeningBatsmen, player];
    setSelectedOpeningBatsmen(newSelected);
    
    // Add to batting stats
    setMatchState(prev => {
      const battingKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Batting' : 'team2Batting')
        : (prev.team1BattingFirst ? 'team2Batting' : 'team1Batting');
      
      const existsInStats = prev[battingKey].find((b: BatsmanStats) => b.id === player.id);
      if (existsInStats) return prev;
      
      return {
        ...prev,
        [battingKey]: [...prev[battingKey], {
          id: player.id,
          name: player.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false
        }]
      };
    });
    
    // If 2 batsmen selected, set them and close dialog
    if (newSelected.length === 2) {
      setMatchState(prev => ({
        ...prev,
        strikeBatsman: { id: newSelected[0].id, name: newSelected[0].name },
        nonStrikeBatsman: { id: newSelected[1].id, name: newSelected[1].name }
      }));
      setShowInitialBatsmanSelect(false);
    }
  }, [selectedOpeningBatsmen, toast]);
  
  // Handle opening bowler selection
  const handleSelectOpeningBowler = useCallback((player: Player) => {
    setSelectedOpeningBowler(player);
    
    // Add to bowling stats
    setMatchState(prev => {
      const bowlingKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team2Bowling' : 'team1Bowling')
        : (prev.team1BattingFirst ? 'team1Bowling' : 'team2Bowling');
      
      const existsInStats = prev[bowlingKey].find((b: BowlerStats) => b.id === player.id);
      if (existsInStats) return prev;
      
      return {
        ...prev,
        [bowlingKey]: [...prev[bowlingKey], {
          id: player.id,
          name: player.name,
          balls: 0,
          overs: '0.0',
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: 0,
          wides: 0,
          noBalls: 0
        }],
        currentBowler: { id: player.id, name: player.name }
      };
    });
    
    setShowInitialBowlerSelect(false);
  }, []);
  
  // Reset match
  const handleResetMatch = useCallback(() => {
    const overs = matchState.matchOvers;
    setMatchState(createInitialMatchState(overs));
    setUndoStack([]);
    setSelectedOpeningBatsmen([]);
    setSelectedOpeningBowler(null);
    setIsMatchStarted(false);
    
    toast({
      title: "Match Reset",
      description: "All scores have been reset"
    });
  }, [matchState.matchOvers, toast]);
  
  // Get available batsmen (not out and not at crease)
  const getAvailableBatsmen = useCallback(() => {
    return battingTeamPlayers.filter(player => {
      const stats = currentBattingStats.find(b => b.id === player.id);
      const isOut = stats?.isOut || false;
      const isAtCrease = player.id === matchState.strikeBatsman.id || player.id === matchState.nonStrikeBatsman.id;
      return !isOut && !isAtCrease;
    });
  }, [battingTeamPlayers, currentBattingStats, matchState]);
  
  // Get max wickets
  const getMaxWicketsDisplay = () => {
    return Math.max(battingTeamPlayers.length - 1, 1); // At least 1 wicket needed
  };

    // Get currently active batsmen at the crease
    const activeBatsmen = useMemo(() => {
      const list = [];
      if (matchState.strikeBatsman.id) {
        list.push({ ...matchState.strikeBatsman });
      }
      if (matchState.nonStrikeBatsman.id) {
        list.push({ ...matchState.nonStrikeBatsman });
      }
      
      // Sort them by their first entry into the match to keep row order stable
      return list.sort((a, b) => {
        const indexA = currentBattingStats.findIndex(s => s.id === a.id);
        const indexB = currentBattingStats.findIndex(s => s.id === b.id);
        // If one is not found (shouldn't happen), keep it at the end
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }, [matchState.strikeBatsman, matchState.nonStrikeBatsman, currentBattingStats]);

  return (
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        {/* Header with Back Button */}
        <div className="bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center p-3 max-w-6xl mx-auto">
            <Button 
              onClick={() => setLocation('/local-match')}
              variant="ghost"
              size="icon"
              data-testid="button-back-to-create-match"
              className="mr-3 text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Match Centre</h1>
          </div>
          
            {/* Tabs Navigation */}
            <Tabs defaultValue="scoring" className="w-full">
              <div className="px-4">
                <TabsList className="bg-transparent border-b-0 h-auto p-0 w-full justify-start overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                <TabsTrigger 
                  value="scoring" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2 text-sm text-gray-500 data-[state=active]:text-blue-600"
                  data-testid="tab-scoring"
                >
                  Scoring
                </TabsTrigger>
                <TabsTrigger 
                  value="scorecard"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2 text-sm text-gray-500 data-[state=active]:text-blue-600"
                  data-testid="tab-scorecard"
                >
                  Scorecard
                </TabsTrigger>
                <TabsTrigger 
                  value="stats"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2 text-sm text-gray-500 data-[state=active]:text-blue-600"
                  data-testid="tab-stats"
                >
                  Stats
                </TabsTrigger>
                <TabsTrigger 
                  value="super-stars"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2 text-sm text-gray-500 data-[state=active]:text-blue-600"
                  data-testid="tab-super-stars"
                >
                  Super Stars
                </TabsTrigger>
                <TabsTrigger 
                  value="balls"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2 text-sm text-gray-500 data-[state=active]:text-blue-600"
                  data-testid="tab-balls"
                >
                  Balls
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>
      
        {/* Main Content Area - White background for score display */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Score Display Section */}
          <div className="flex-1 p-2 sm:p-3">
            <div className="max-w-6xl mx-auto space-y-2 sm:space-y-3">
              {/* Team and Score Display */}
              <div className="text-center space-y-0.5 sm:space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  {localStorage.getItem('myTeamName') || 'Your Team'}
                </h2>
                <p className="text-[10px] sm:text-xs text-gray-500">
                    {matchState.currentInnings === 1 ? '1st Innings' : '2nd Innings'}
                    {matchState.currentInnings === 2 && matchState.target && (
                      <span className="ml-2 text-blue-600 font-medium">
                        Target: {matchState.target} | Need {Math.max(0, matchState.target - battingTeamScore.runs)}
                      </span>
                    )}
                  </p>
                  
                  {matchState.isFreeHit && (
                    <div className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse inline-block">
                      FREE HIT
                    </div>
                  )}
                  
                  <div className="text-2xl sm:text-4xl font-bold text-blue-600 leading-tight">
                    {battingTeamScore.runs}-{battingTeamScore.wickets}
                  </div>
                
                {/* Match Info Row */}
                <div className="flex justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
                  <span>Extras - {battingTeamScore.extras.wides + battingTeamScore.extras.noBalls + battingTeamScore.extras.byes + battingTeamScore.extras.legByes}</span>
                  <span>Overs - {formatOvers(battingTeamScore.balls)} / {matchState.matchOvers}</span>
                  <span>CRR - {battingTeamScore.balls > 0 ? (battingTeamScore.runs / (battingTeamScore.balls / 6)).toFixed(2) : '0.00'}</span>
                </div>
                
                {/* Partnership */}
                  <div className="text-[10px] sm:text-xs text-gray-500">
                    Partnership - {getCurrentBatsmanStats(true).runs + getCurrentBatsmanStats(false).runs}({getCurrentBatsmanStats(true).balls + getCurrentBatsmanStats(false).balls})
                  </div>
                  
                  {/* Current Over Display */}
                  {matchState.currentOver.length > 0 && (
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-1 sm:mt-2">
                      <span className="text-[10px] sm:text-xs text-gray-500">This Over:</span>
                      <div className="flex gap-0.5 sm:gap-1">
                        {matchState.currentOver.map((ball, idx) => (
                          <span 
                            key={idx} 
                            className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${
                              ball === 'W' ? 'bg-red-500 text-white' :
                              ball.includes('Wd') || ball.includes('Nb') ? 'bg-yellow-400 text-yellow-900' :
                              ball === '4' || ball === '6' ? 'bg-green-500 text-white' :
                              ball === '0' || ball === '•' ? 'bg-gray-300 text-gray-700' :
                              'bg-blue-500 text-white'
                            }`}
                          >
                            {ball}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              
                {/* Current Batsmen Table */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-medium text-gray-700">Batsman</span>
                    <span className="text-right ml-auto text-[10px] sm:text-xs text-gray-500">R</span>
                    <span className="text-center w-5 sm:w-6 text-[10px] sm:text-xs text-gray-500">B</span>
                    <span className="text-center w-5 sm:w-6 text-[10px] sm:text-xs text-gray-500">4s</span>
                    <span className="text-center w-5 sm:w-6 text-[10px] sm:text-xs text-gray-500">6s</span>
                    <span className="text-center w-7 sm:w-8 text-[10px] sm:text-xs text-gray-500">SR</span>
                  </div>
                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="w-full">
                        <tbody>
                          {activeBatsmen.length > 0 ? (
                            <>
                              {activeBatsmen.map((batsman, idx) => {
                                const stats = getBatsmanStatsById(batsman.id);
                                const isStriker = batsman.id === matchState.strikeBatsman.id;
                                return (
                                  <tr 
                                    key={batsman.id}
                                    className={`cursor-pointer transition-colors hover:bg-blue-50 ${isStriker ? 'bg-blue-100' : ''} ${idx === 0 && activeBatsmen.length > 1 ? 'border-b' : ''}`}
                                    onClick={() => {
                                      if (!isMatchStarted && activeBatsmen.length === 2 && selectedOpeningBowler) {
                                        setMatchState(prev => ({
                                          ...prev,
                                          strikeBatsman: { id: batsman.id, name: batsman.name },
                                          nonStrikeBatsman: { 
                                            id: activeBatsmen[1-idx].id, 
                                            name: activeBatsmen[1-idx].name 
                                          },
                                          currentBowler: { id: selectedOpeningBowler.id, name: selectedOpeningBowler.name }
                                        }));
                                        setIsMatchStarted(true);
                                      }
                                    }}
                                  >
                                    <td className="p-1.5 sm:p-2 text-xs sm:text-sm font-medium" data-testid={`batsman-${idx + 1}-name`}>
                                      <span className={isStriker ? 'bg-blue-200 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-sm' : ''}>
                                        {batsman.name}
                                        {isStriker && ' *'}
                                      </span>
                                    </td>
                                    <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{stats.runs || 0}</td>
                                    <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{stats.balls || 0}</td>
                                    <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{stats.fours || 0}</td>
                                    <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{stats.sixes || 0}</td>
                                    <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{stats.strikeRate?.toFixed(1) || '0.0'}</td>
                                  </tr>
                                );
                              })}
                              {activeBatsmen.length === 1 && (
                                <tr className="border-t">
                                  <td className="p-1.5 sm:p-2 text-xs sm:text-sm text-gray-400" data-testid="batsman-2-name">-</td>
                                  <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                  <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                  <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                  <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                  <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                </tr>
                              )}
                            </>
                          ) : (
                            <>
                              <tr className="border-b">
                                <td className="p-1.5 sm:p-2 text-xs sm:text-sm text-gray-400" data-testid="batsman-1-name">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                              </tr>
                              <tr>
                                <td className="p-1.5 sm:p-2 text-xs sm:text-sm text-gray-400" data-testid="batsman-2-name">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                                <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm text-gray-600">-</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                    </table>
                  </div>
                  {!isMatchStarted && activeBatsmen.length === 2 && (
                    <p className="text-[10px] text-gray-500 mt-1 text-center">
                      Click on a batsman to set as striker (*)
                    </p>
                  )}
                </div>
              
              {/* Current Bowler Table */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700">Bowler</span>
                  <span className="text-right ml-auto text-[10px] sm:text-xs text-gray-500">O</span>
                  <span className="text-center w-5 sm:w-6 text-[10px] sm:text-xs text-gray-500">M</span>
                  <span className="text-center w-5 sm:w-6 text-[10px] sm:text-xs text-gray-500">R</span>
                  <span className="text-center w-5 sm:w-6 text-[10px] sm:text-xs text-gray-500">W</span>
                  <span className="text-center w-7 sm:w-8 text-[10px] sm:text-xs text-gray-500">Eco</span>
                </div>
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                  <table className="w-full">
                    <tbody>
                        <tr>
                          <td className="p-1.5 sm:p-2 text-xs sm:text-sm font-medium" data-testid="bowler-name">
                            {matchState.currentBowler.name || selectedOpeningBowler?.name || '-'}
                          </td>
                        <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{getCurrentBowlerStats().overs || '0.0'}</td>
                        <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">0</td>
                        <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{getCurrentBowlerStats().runs || 0}</td>
                        <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{getCurrentBowlerStats().wickets || 0}</td>
                        <td className="text-center p-1.5 sm:p-2 text-xs sm:text-sm">{getCurrentBowlerStats().economy?.toFixed(1) || '0.0'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        
          {/* Bottom Panel - Fixed at bottom with white background */}
          {!isMatchStarted ? (
            <div className="bg-white border-t border-gray-200 p-3 shrink-0">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setLocation('/local-match')}
                    className="text-gray-900 hover:text-gray-600"
                    data-testid="button-close-selection-panel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <h3 className="text-gray-900 font-bold text-lg">Select Players</h3>
                  <div className="w-5"></div>
                </div>
                
                {selectedOpeningBatsmen.length < 2 || !selectedOpeningBowler ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => setShowInitialBatsmanSelect(true)}
                      className={`h-12 text-sm font-semibold border-2 overflow-hidden px-2 ${
                        selectedOpeningBatsmen.length === 2 
                          ? 'bg-green-100 text-green-700 border-green-300' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                      }`}
                      data-testid="button-select-batsman-panel"
                    >
                      {selectedOpeningBatsmen.length === 2 ? '✓ Batsmen' : 'Select Batsman'}
                    </Button>
                    <Button
                      onClick={() => setShowInitialBowlerSelect(true)}
                      className={`h-12 text-sm font-semibold border-2 overflow-hidden px-2 ${
                        selectedOpeningBowler 
                          ? 'bg-green-100 text-green-700 border-green-300' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                      }`}
                      data-testid="button-select-bowler-panel"
                    >
                      {selectedOpeningBowler ? '✓ Bowler' : 'Select Bowler'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-gray-700 text-sm mb-3">
                    <p>Click on a batsman name above to set as striker</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border-t border-gray-200 p-3 shrink-0">
              <div className="max-w-6xl mx-auto space-y-2">
                {showInlineExtras ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-blue-600 font-bold text-sm">
                        {extrasType === 'wd' ? 'Wide' : extrasType === 'nb' ? 'No Ball' : extrasType === 'b' ? 'Bye' : 'Leg Bye'} Runs
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowInlineExtras(false)}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[0, 1, 2, 3, 4].map(runs => (
                        <Button
                          key={runs}
                          onClick={() => handleExtras(extrasType, runs)}
                          className="h-12 text-lg font-bold bg-blue-600 text-white hover:bg-blue-700 border-0 shadow-sm"
                        >
                          {runs}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : showInlineWicket ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-blue-600 font-bold text-sm">
                        Record Wicket {wicketStep === 'fielder' ? '- Select Fielder' : wicketStep === 'runout_details' ? '- Run Out Details' : ''}
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setShowInlineWicket(false);
                          setWicketStep('how');
                        }}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {wicketStep === 'how' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 justify-center py-1">
                          <span className="text-xs font-semibold text-gray-600">Who is out?</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={dismissedBatsman === 'striker' ? "default" : "outline"}
                              onClick={() => setDismissedBatsman('striker')}
                              className={dismissedBatsman === 'striker' ? "bg-blue-600 text-white" : "border-blue-200 text-blue-600"}
                            >
                              {matchState.strikeBatsman.name || 'Striker'}
                            </Button>
                            <Button
                              size="sm"
                              variant={dismissedBatsman === 'non-striker' ? "default" : "outline"}
                              onClick={() => setDismissedBatsman('non-striker')}
                              className={dismissedBatsman === 'non-striker' ? "bg-blue-600 text-white" : "border-blue-200 text-blue-600"}
                            >
                              {matchState.nonStrikeBatsman.name || 'Non-Striker'}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { label: 'Bowled', value: 'bowled' },
                            { label: 'LBW', value: 'lbw' },
                            { label: 'Hit Wicket', value: 'hit_wicket' },
                            { label: 'Caught', value: 'caught' },
                            { label: 'Stumped', value: 'stumped' },
                            { label: 'Run Out', value: 'run_out' }
                          ].map(type => (
                            <Button
                              key={type.value}
                              onClick={() => {
                                setSelectedDismissalType(type.value);
                                if (['bowled', 'lbw', 'hit_wicket'].includes(type.value)) {
                                  handleInlineWicketSubmit(type.value);
                                } else {
                                  setWicketStep(type.value === 'run_out' ? 'runout_details' : 'fielder');
                                }
                              }}
                              className="h-10 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 border-0 shadow-sm"
                            >
                              {type.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {wicketStep === 'fielder' && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-center text-gray-500 font-medium">Select fielder who took the catch/stumping</p>
                        <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-1 scrollbar-hide">
                          {bowlingTeamPlayers.map(player => (
                            <Button
                              key={player.id}
                              onClick={() => {
                                setSelectedFielder(player.name);
                                handleInlineWicketSubmit(selectedDismissalType, player.name);
                              }}
                              className="h-10 text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0 truncate shadow-sm"
                            >
                              {player.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {wicketStep === 'runout_details' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-gray-600 block text-center">Completed Runs</span>
                          <div className="flex gap-1 justify-center">
                            {[0, 1, 2, 3].map(runs => (
                              <Button
                                key={runs}
                                size="sm"
                                variant={runoutCompletedRuns === runs ? "default" : "outline"}
                                onClick={() => setRunoutCompletedRuns(runs)}
                                className={`h-8 w-10 ${runoutCompletedRuns === runs ? "bg-blue-600 text-white" : "border-blue-200 text-blue-600"}`}
                              >
                                {runs}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-gray-600 block text-center">Fielder & End</span>
                          <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto p-1 scrollbar-hide">
                            <Button
                              onClick={() => handleInlineWicketSubmit('run_out', undefined)}
                              className="h-8 text-[10px] font-semibold bg-gray-500 text-white hover:bg-gray-600 border-0 shadow-sm"
                            >
                              None
                            </Button>
                            {bowlingTeamPlayers.map(player => (
                              <Button
                                key={player.id}
                                onClick={() => {
                                  setSelectedFielder(player.name);
                                  handleInlineWicketSubmit('run_out', player.name);
                                }}
                                className="h-8 text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0 truncate shadow-sm"
                              >
                                {player.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Run Buttons Row 1 */}
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 6].map(runs => (
                        <Button
                          key={runs}
                          onClick={() => handleRunScored(runs)}
                          className="h-12 text-lg font-bold bg-blue-600 text-white hover:bg-blue-700 border-0"
                          data-testid={`button-runs-${runs}`}
                        >
                          {runs}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Extras Row */}
                    <div className="grid grid-cols-5 gap-1">
                      <Button
                        onClick={() => {
                          saveStateForUndo();
                          setExtrasType('lb');
                          setShowInlineExtras(true);
                        }}
                        className="h-10 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0"
                        data-testid="button-leg-bye"
                      >
                        LB
                      </Button>
                      <Button
                        onClick={() => {
                          saveStateForUndo();
                          setExtrasType('b');
                          setShowInlineExtras(true);
                        }}
                        className="h-10 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0"
                        data-testid="button-bye"
                      >
                        Bye
                      </Button>
                      <Button
                        onClick={() => {
                          saveStateForUndo();
                          setExtrasType('wd');
                          setShowInlineExtras(true);
                        }}
                        className="h-10 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0"
                        data-testid="button-wide"
                      >
                        Wide
                      </Button>
                      <Button
                        onClick={() => {
                          saveStateForUndo();
                          setExtrasType('nb');
                          setShowInlineExtras(true);
                        }}
                        className="h-10 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0"
                        data-testid="button-no-ball"
                      >
                        NB
                      </Button>
                      <Button
                        onClick={() => handleRunScored(0)}
                        className="h-10 text-xl font-bold bg-blue-600 text-white hover:bg-blue-700 border-0"
                        data-testid="button-dot"
                      >
                        •
                      </Button>
                    </div>
                    
                    {/* Bottom Controls */}
                    <div className="grid grid-cols-5 gap-1">
                      <Button
                        variant="outline"
                        className="h-10 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0"
                      >
                        More
                      </Button>
                      <Button
                        onClick={() => handleRunScored(0)}
                        className="h-10 font-bold bg-blue-600 text-white hover:bg-blue-700 border-0"
                      >
                        <img src="/cricket-ball.svg" alt="ball" className="w-4 h-4" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                        <span className="hidden">0</span>
                      </Button>
                      <Button
                        className="h-10 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0"
                      >
                        4 5 6 7
                      </Button>
                      <Button
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="h-10 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 border-0"
                        data-testid="button-undo"
                      >
                        Undo
                      </Button>
                      <Button
                        onClick={() => {
                          saveStateForUndo();
                          setShowInlineWicket(true);
                          setWicketStep('how');
                        }}
                        className="h-10 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 border-0"
                        data-testid="button-wicket"
                      >
                        Out
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Dialogs */}
      
      {/* Initial Batsman Selection Dialog */}
        <Dialog open={showInitialBatsmanSelect} onOpenChange={setShowInitialBatsmanSelect}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <DialogTitle className="text-white text-lg font-bold">Select Opening Batsmen</DialogTitle>
              <DialogDescription className="text-blue-100">Select 2 batsmen to open the innings</DialogDescription>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {battingTeamPlayers.map((player, idx) => (
                  <Button
                    key={player.id || `p1-${idx}`}
                    variant={selectedOpeningBatsmen.find(p => p.id === player.id) ? "default" : "outline"}
                    className={`w-full justify-start ${
                      selectedOpeningBatsmen.find(p => p.id === player.id) 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'border-blue-200 hover:bg-blue-50 hover:border-blue-400'
                    }`}
                    onClick={() => handleSelectOpeningBatsman(player)}
                    data-testid={`select-batsman-${player.id}`}
                  >
                    {selectedOpeningBatsmen.find(p => p.id === player.id) && "✓ "}
                    {player.name}
                  </Button>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Add Guest Player</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter guest player name"
                    value={guestBatsmanName}
                    onChange={(e) => setGuestBatsmanName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGuestBatsman()}
                    className="flex-1 border-blue-200 focus:border-blue-400"
                  />
                  <Button 
                    onClick={handleAddGuestBatsman}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      
      {/* Initial Bowler Selection Dialog */}
      <Dialog open={showInitialBowlerSelect} onOpenChange={setShowInitialBowlerSelect}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <DialogTitle className="text-white text-lg font-bold">Select Opening Bowler</DialogTitle>
            <DialogDescription className="text-blue-100">Select the bowler to start the innings</DialogDescription>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {bowlingTeamPlayers.map((player, idx) => (
                <Button
                  key={player.id || `p2-${idx}`}
                  variant={selectedOpeningBowler?.id === player.id ? "default" : "outline"}
                  className={`w-full justify-start ${
                    selectedOpeningBowler?.id === player.id 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'border-blue-200 hover:bg-blue-50 hover:border-blue-400'
                  }`}
                  onClick={() => handleSelectOpeningBowler(player)}
                  data-testid={`select-bowler-${player.id}`}
                >
                  {selectedOpeningBowler?.id === player.id && "✓ "}
                  {player.name}
                </Button>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Add Guest Player</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter guest player name"
                  value={guestBowlerName}
                  onChange={(e) => setGuestBowlerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGuestBowler()}
                  className="flex-1 border-blue-200 focus:border-blue-400"
                />
                <Button 
                  onClick={handleAddGuestBowler}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Batsman Selection Dialog */}
      <Dialog open={showBatsmanSelectDialog} onOpenChange={setShowBatsmanSelectDialog}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <DialogTitle className="text-white text-lg font-bold">Select New Batsman</DialogTitle>
            <DialogDescription className="text-blue-100">Select the next batsman to come in</DialogDescription>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {getAvailableBatsmen().map((player, idx) => (
                <Button
                  key={player.id || `p3-${idx}`}
                  variant="outline"
                  className="w-full justify-start border-blue-200 hover:bg-blue-50 hover:border-blue-400"
                  onClick={() => handleSelectBatsman(player)}
                  data-testid={`select-new-batsman-${player.id}`}
                >
                  {player.name}
                </Button>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Add Guest Player</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter guest player name"
                  value={guestBatsmanName}
                  onChange={(e) => setGuestBatsmanName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGuestBatsman()}
                  className="flex-1 border-blue-200 focus:border-blue-400"
                />
                <Button 
                  onClick={handleAddGuestBatsman}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        
        {/* Bowler Selection Dialog */}
        <Dialog open={showBowlerSelectDialog} onOpenChange={setShowBowlerSelectDialog}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <DialogTitle className="text-white text-lg font-bold">Select Bowler</DialogTitle>
              <DialogDescription className="text-blue-100">Select the bowler for the next over</DialogDescription>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {bowlingTeamPlayers.map((player, idx) => (
                  <Button
                    key={player.id || `p4-${idx}`}
                    variant={matchState.currentBowler.id === player.id ? "default" : "outline"}
                    className={`w-full justify-start ${
                      matchState.currentBowler.id === player.id 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'border-blue-200 hover:bg-blue-50 hover:border-blue-400'
                    }`}
                    onClick={() => handleSelectBowler(player)}
                    data-testid={`select-next-bowler-${player.id}`}
                  >
                    {player.name}
                    {currentBowlingStats.find(b => b.id === player.id) && 
                      ` (${currentBowlingStats.find(b => b.id === player.id)?.overs || '0.0'} overs)`
                    }
                  </Button>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Add Guest Player</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter guest player name"
                    value={guestBowlerName}
                    onChange={(e) => setGuestBowlerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGuestBowler()}
                    className="flex-1 border-blue-200 focus:border-blue-400"
                  />
                  <Button 
                    onClick={handleAddGuestBowler}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      
        {/* End Innings Dialog */}
      <Dialog open={showEndInningsDialog} onOpenChange={setShowEndInningsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End of Innings</DialogTitle>
            <DialogDescription>
              First innings complete. Score: {battingTeamScore.runs}/{battingTeamScore.wickets}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleInningsEnd}>Start 2nd Innings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Match Ended Dialog */}
      <Dialog open={showMatchEndedDialog} onOpenChange={setShowMatchEndedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Complete</DialogTitle>
            <DialogDescription>{matchState.result}</DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            <p className="text-xl font-bold">{matchState.result}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocation('/local-match')}>Back to Home</Button>
            <Button onClick={handleResetMatch}>New Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
