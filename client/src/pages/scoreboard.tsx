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
}

interface BallEvent {
  type: 'runs' | 'wide' | 'noball' | 'bye' | 'legbye' | 'wicket';
  runs: number;
  extras?: number;
  dismissalType?: string;
  batsmanId?: string;
  bowlerId?: string;
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
  isMatchComplete: false
});

export default function Scoreboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
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
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [extrasType, setExtrasType] = useState<'wd' | 'nb' | 'b' | 'lb'>('wd');
  const [extrasRuns, setExtrasRuns] = useState(1);
  const [showMatchEndedDialog, setShowMatchEndedDialog] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  // Wicket dialog state
  const [selectedDismissalType, setSelectedDismissalType] = useState('');
  const [selectedFielder, setSelectedFielder] = useState('');
  const [dismissedBatsman, setDismissedBatsman] = useState<'striker' | 'non-striker'>('striker');
  
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
  
  // Handle run scored
  const handleRunScored = useCallback((runs: number) => {
    if (!matchState.strikeBatsman.id || !matchState.currentBowler.id) {
      toast({
        title: "Select Players",
        description: "Please select batsmen and bowler first",
        variant: "destructive"
      });
      return;
    }
    
    saveStateForUndo();
    
    // Start match if not started
    if (!isMatchStarted) {
      setIsMatchStarted(true);
    }
    
    const isBoundary = runs === 4 || runs === 6;
    
    // Update batsman stats
    updateBatsmanStats(matchState.strikeBatsman.id, runs, isBoundary);
    
    // Update bowler stats
    updateBowlerStats(matchState.currentBowler.id, runs);
    
    // Update team score and balls
    setMatchState(prev => {
      const scoreKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Score' : 'team2Score')
        : (prev.team1BattingFirst ? 'team2Score' : 'team1Score');
      
      const newBalls = prev[scoreKey].balls + 1;
      const newOver = [...prev.currentOver, runs.toString()];
      
      // Check for over complete
      const isOverComplete = newBalls % 6 === 0;
      
      return {
        ...prev,
        [scoreKey]: {
          ...prev[scoreKey],
          runs: prev[scoreKey].runs + runs,
          balls: newBalls
        },
        currentOver: isOverComplete ? [] : newOver
      };
    });
    
    // Rotate strike for odd runs
    if (runs % 2 === 1) {
      rotateStrike();
    }
    
    // Check for over complete - show bowler select
    const newBalls = battingTeamScore.balls + 1;
    if (newBalls % 6 === 0 && newBalls < matchState.matchOvers * 6) {
      // Rotate strike at end of over
      setTimeout(() => {
        rotateStrike();
        setShowBowlerSelectDialog(true);
      }, 100);
    }
    
    // Check for innings complete
    checkInningsComplete(battingTeamScore.runs + runs, battingTeamScore.wickets, newBalls);
    
  }, [matchState, saveStateForUndo, updateBatsmanStats, updateBowlerStats, rotateStrike, battingTeamScore, isMatchStarted, toast]);
  
  // Handle extras
  const handleExtras = useCallback((type: 'wd' | 'nb' | 'b' | 'lb', runs: number) => {
    if (!matchState.currentBowler.id) {
      toast({
        title: "Select Bowler",
        description: "Please select a bowler first",
        variant: "destructive"
      });
      return;
    }
    
    saveStateForUndo();
    
    const extraType = type === 'wd' ? 'wide' : type === 'nb' ? 'noball' : type === 'b' ? 'bye' : 'legbye';
    const runsToAdd = type === 'wd' || type === 'nb' ? runs + 1 : runs;
    const ballIncrement = type === 'wd' || type === 'nb' ? 0 : 1;
    
    // Update bowler stats for wides and no-balls
    if (type === 'wd' || type === 'nb') {
      updateBowlerStats(matchState.currentBowler.id, runsToAdd, false, true, extraType);
    } else {
      updateBowlerStats(matchState.currentBowler.id, 0);
    }
    
    // Update team score
    setMatchState(prev => {
      const scoreKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Score' : 'team2Score')
        : (prev.team1BattingFirst ? 'team2Score' : 'team1Score');
      
      const extrasKey = type === 'wd' ? 'wides' : type === 'nb' ? 'noBalls' : type === 'b' ? 'byes' : 'legByes';
      
      return {
        ...prev,
        [scoreKey]: {
          ...prev[scoreKey],
          runs: prev[scoreKey].runs + runsToAdd,
          balls: prev[scoreKey].balls + ballIncrement,
          extras: {
            ...prev[scoreKey].extras,
            [extrasKey]: prev[scoreKey].extras[extrasKey] + runsToAdd
          }
        },
        currentOver: ballIncrement > 0 ? [...prev.currentOver, type.toUpperCase()] : prev.currentOver
      };
    });
    
    // Rotate strike for odd runs (except for wides)
    if (runs % 2 === 1 && type !== 'wd') {
      rotateStrike();
    }
    
    setShowExtrasDialog(false);
  }, [matchState, saveStateForUndo, updateBowlerStats, rotateStrike, toast]);
  
  // Handle wicket
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
    
    // Mark batsman as out
    const updateBattingFn = (stats: BatsmanStats[]): BatsmanStats[] => {
      return stats.map(b => {
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
      });
    };
    
    // Update bowler wickets (not for run out)
    if (selectedDismissalType !== 'run_out') {
      updateBowlerStats(matchState.currentBowler.id, 0, true);
    } else {
      updateBowlerStats(matchState.currentBowler.id, 0);
    }
    
    // Update match state
    setMatchState(prev => {
      const scoreKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Score' : 'team2Score')
        : (prev.team1BattingFirst ? 'team2Score' : 'team1Score');
      
      const battingKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Batting' : 'team2Batting')
        : (prev.team1BattingFirst ? 'team2Batting' : 'team1Batting');
      
      const newWickets = prev[scoreKey].wickets + 1;
      const newBalls = prev[scoreKey].balls + 1;
      
      return {
        ...prev,
        [scoreKey]: {
          ...prev[scoreKey],
          wickets: newWickets,
          balls: newBalls
        },
        [battingKey]: updateBattingFn(prev[battingKey]),
        currentOver: [...prev.currentOver, 'W'],
        strikeBatsman: dismissedBatsman === 'striker' ? { id: '', name: '' } : prev.strikeBatsman,
        nonStrikeBatsman: dismissedBatsman === 'non-striker' ? { id: '', name: '' } : prev.nonStrikeBatsman
      };
    });
    
    setShowWicketDialog(false);
    setSelectedDismissalType('');
    setSelectedFielder('');
    setDismissedBatsman('striker');
    
    // Check if need new batsman or innings over
    const newWickets = battingTeamScore.wickets + 1;
    const maxWickets = getMaxWickets();
    
    if (newWickets >= maxWickets) {
      // All out
      handleInningsEnd();
    } else {
      // Need new batsman
      setShowBatsmanSelectDialog(true);
    }
    
  }, [matchState, selectedDismissalType, selectedFielder, dismissedBatsman, updateBowlerStats, battingTeamScore, toast]);
  
  // Get max wickets based on team size
  const getMaxWickets = useCallback(() => {
    return Math.max(battingTeamPlayers.length - 1, 1); // At least 1 wicket needed
  }, [battingTeamPlayers]);
  
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
      currentOver: []
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
  const handleAddGuestBatsman = useCallback(() => {
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
    
    // Add to batting team players
    if (matchState.currentInnings === 1) {
      if (matchState.team1BattingFirst) {
        setTeam1Players(prev => [...prev, newPlayer]);
      } else {
        setTeam2Players(prev => [...prev, newPlayer]);
      }
    } else {
      if (matchState.team1BattingFirst) {
        setTeam2Players(prev => [...prev, newPlayer]);
      } else {
        setTeam1Players(prev => [...prev, newPlayer]);
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
    
    setGuestBatsmanName('');
    toast({
      title: "Player Added",
      description: `${newPlayer.name} has been added to the team`
    });
  }, [guestBatsmanName, matchState.currentInnings, matchState.team1BattingFirst, toast]);
  
  // Add guest bowler to team
  const handleAddGuestBowler = useCallback(() => {
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
    
    // Add to bowling team players
    if (matchState.currentInnings === 1) {
      if (matchState.team1BattingFirst) {
        setTeam2Players(prev => [...prev, newPlayer]);
      } else {
        setTeam1Players(prev => [...prev, newPlayer]);
      }
    } else {
      if (matchState.team1BattingFirst) {
        setTeam1Players(prev => [...prev, newPlayer]);
      } else {
        setTeam2Players(prev => [...prev, newPlayer]);
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
    
    setGuestBowlerName('');
    toast({
      title: "Player Added",
      description: `${newPlayer.name} has been added to the team`
    });
  }, [guestBowlerName, matchState.currentInnings, matchState.team1BattingFirst, toast]);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header with Back Button */}
      <div className="border-b bg-background shrink-0">
        <div className="flex items-center p-3 max-w-6xl mx-auto">
          <Button 
            onClick={() => setLocation('/local-match')}
            variant="ghost"
            size="icon"
            data-testid="button-back-to-create-match"
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Match Centre</h1>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs defaultValue="scoring" className="w-full flex flex-col flex-1">
          <div className="border-b px-4 shrink-0">
            <TabsList className="bg-transparent border-b-0 h-auto p-0 w-full justify-start overflow-x-auto">
              <TabsTrigger 
                value="scoring" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
                data-testid="tab-scoring"
              >
                Scoring
              </TabsTrigger>
              <TabsTrigger 
                value="scorecard"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
                data-testid="tab-scorecard"
              >
                Scorecard
              </TabsTrigger>
              <TabsTrigger 
                value="stats"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
                data-testid="tab-stats"
              >
                Stats
              </TabsTrigger>
              <TabsTrigger 
                value="super-stars"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
                data-testid="tab-super-stars"
              >
                Super Stars
              </TabsTrigger>
              <TabsTrigger 
                value="balls"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
                data-testid="tab-balls"
              >
                Balls
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
      
      {/* Main Content Area - Flex grow to fill remaining space */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Score Display Section */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="max-w-6xl mx-auto space-y-3">
            {/* Team and Score Display */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold">
                {localStorage.getItem('myTeamName') || 'Your Team'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {matchState.currentInnings === 1 ? '1st Innings' : '2nd Innings'}
              </p>
              
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-500">
                {battingTeamScore.runs}-{battingTeamScore.wickets}
              </div>
              
              {/* Match Info Row */}
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span>Extras - {battingTeamScore.extras.wides + battingTeamScore.extras.noBalls + battingTeamScore.extras.byes + battingTeamScore.extras.legByes}</span>
                <span>Overs - {formatOvers(battingTeamScore.balls)} / {matchState.matchOvers}</span>
                <span>CRR - {battingTeamScore.balls > 0 ? (battingTeamScore.runs / (battingTeamScore.balls / 6)).toFixed(2) : '0.00'}</span>
              </div>
              
              {/* Partnership */}
              <div className="text-xs text-muted-foreground">
                Partnership - {getCurrentBatsmanStats(true).runs + getCurrentBatsmanStats(false).runs}({getCurrentBatsmanStats(true).balls + getCurrentBatsmanStats(false).balls})
              </div>
            </div>
            
              {/* Current Batsmen Table */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">Batsman</span>
                  <span className="text-right ml-auto text-xs text-muted-foreground">R</span>
                  <span className="text-center w-6 text-xs text-muted-foreground">B</span>
                  <span className="text-center w-6 text-xs text-muted-foreground">4s</span>
                  <span className="text-center w-6 text-xs text-muted-foreground">6s</span>
                  <span className="text-center w-8 text-xs text-muted-foreground">SR</span>
                </div>
                <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg border">
                  <table className="w-full">
                    <tbody>
                      {(matchState.strikeBatsman.name || selectedOpeningBatsmen.length > 0) ? (
                        <>
                            <tr 
                              className={`border-b cursor-pointer transition-colors hover:bg-blue-50 ${
                                matchState.strikeBatsman.id === (selectedOpeningBatsmen[0]?.id || matchState.strikeBatsman.id) ? 'bg-blue-100' : ''
                              }`}
                              onClick={() => {
                                if (!isMatchStarted && selectedOpeningBatsmen.length === 2 && selectedOpeningBowler) {
                                  setMatchState(prev => ({
                                    ...prev,
                                    strikeBatsman: { id: selectedOpeningBatsmen[0].id, name: selectedOpeningBatsmen[0].name },
                                    nonStrikeBatsman: { id: selectedOpeningBatsmen[1].id, name: selectedOpeningBatsmen[1].name },
                                    currentBowler: { id: selectedOpeningBowler.id, name: selectedOpeningBowler.name }
                                  }));
                                  setIsMatchStarted(true);
                                }
                              }}
                            >
                            <td className="p-2 text-sm font-medium" data-testid="batsman-1-name">
                              <span className={matchState.strikeBatsman.id === (selectedOpeningBatsmen[0]?.id || matchState.strikeBatsman.id) ? 'bg-blue-200 px-2 py-0.5 rounded text-sm' : ''}>
                                {selectedOpeningBatsmen[0]?.name || matchState.strikeBatsman.name || '-'}
                                {matchState.strikeBatsman.id === (selectedOpeningBatsmen[0]?.id || matchState.strikeBatsman.id) && ' *'}
                              </span>
                            </td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(true).runs || 0}</td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(true).balls || 0}</td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(true).fours || 0}</td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(true).sixes || 0}</td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(true).strikeRate?.toFixed(1) || '0.0'}</td>
                          </tr>
                            <tr 
                              className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                                matchState.strikeBatsman.id === (selectedOpeningBatsmen[1]?.id) ? 'bg-blue-100' : ''
                              }`}
                              onClick={() => {
                                if (!isMatchStarted && selectedOpeningBatsmen.length === 2 && selectedOpeningBowler) {
                                  setMatchState(prev => ({
                                    ...prev,
                                    strikeBatsman: { id: selectedOpeningBatsmen[1].id, name: selectedOpeningBatsmen[1].name },
                                    nonStrikeBatsman: { id: selectedOpeningBatsmen[0].id, name: selectedOpeningBatsmen[0].name },
                                    currentBowler: { id: selectedOpeningBowler.id, name: selectedOpeningBowler.name }
                                  }));
                                  setIsMatchStarted(true);
                                }
                              }}
                            >
                            <td className="p-2 text-sm font-medium" data-testid="batsman-2-name">
                              <span className={matchState.strikeBatsman.id === (selectedOpeningBatsmen[1]?.id) ? 'bg-blue-200 px-2 py-0.5 rounded text-sm' : ''}>
                                {selectedOpeningBatsmen[1]?.name || matchState.nonStrikeBatsman.name || '-'}
                                {matchState.strikeBatsman.id === (selectedOpeningBatsmen[1]?.id) && ' *'}
                              </span>
                            </td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(false).runs || 0}</td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(false).balls || 0}</td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(false).fours || 0}</td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(false).sixes || 0}</td>
                            <td className="text-center p-2 text-sm">{getCurrentBatsmanStats(false).strikeRate?.toFixed(1) || '0.0'}</td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr className="border-b">
                            <td className="p-2 text-sm text-muted-foreground" data-testid="batsman-1-name">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-sm text-muted-foreground" data-testid="batsman-2-name">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                            <td className="text-center p-2 text-sm">-</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
                {!isMatchStarted && selectedOpeningBatsmen.length === 2 && (
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Click on a batsman to set as striker (*)
                  </p>
                )}
              </div>
            
            {/* Current Bowler Table */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">✏️ Bowler</span>
                <span className="text-right ml-auto text-xs text-muted-foreground">O</span>
                <span className="text-center w-6 text-xs text-muted-foreground">M</span>
                <span className="text-center w-6 text-xs text-muted-foreground">R</span>
                <span className="text-center w-6 text-xs text-muted-foreground">W</span>
                <span className="text-center w-8 text-xs text-muted-foreground">Eco</span>
              </div>
              <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg border">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="p-2 text-sm font-medium" data-testid="bowler-name">
                        {selectedOpeningBowler?.name || matchState.currentBowler.name || '-'}
                      </td>
                      <td className="text-center p-2 text-sm">{getCurrentBowlerStats().overs || '0.0'}</td>
                      <td className="text-center p-2 text-sm">0</td>
                      <td className="text-center p-2 text-sm">{getCurrentBowlerStats().runs || 0}</td>
                      <td className="text-center p-2 text-sm">{getCurrentBowlerStats().wickets || 0}</td>
                      <td className="text-center p-2 text-sm">{getCurrentBowlerStats().economy?.toFixed(1) || '0.0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Panel - Fixed at bottom with blue background */}
        {!isMatchStarted ? (
          <div className="bg-blue-600 p-3 shrink-0">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setLocation('/local-match')}
                  className="text-white hover:text-blue-100"
                  data-testid="button-close-selection-panel"
                >
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-white font-bold text-lg">Select Players</h3>
                <div className="w-5"></div>
              </div>
              
              {selectedOpeningBatsmen.length < 2 || !selectedOpeningBowler ? (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => setShowInitialBatsmanSelect(true)}
                    className={`h-12 text-sm font-semibold border-2 overflow-hidden px-2 ${
                      selectedOpeningBatsmen.length === 2 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-white hover:bg-blue-50 text-blue-600 border-white'
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
                        : 'bg-white hover:bg-blue-50 text-blue-600 border-white'
                    }`}
                    data-testid="button-select-bowler-panel"
                  >
                    {selectedOpeningBowler ? '✓ Bowler' : 'Select Bowler'}
                  </Button>
                </div>
              ) : (
                <div className="text-center text-white text-sm mb-3">
                  <p>Click on a batsman name above to set as striker</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-blue-600 p-3 shrink-0">
            <div className="max-w-6xl mx-auto space-y-2">
              {/* Run Buttons Row 1 */}
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 6].map(runs => (
                  <Button
                    key={runs}
                    onClick={() => handleRunScored(runs)}
                    className="h-12 text-lg font-bold bg-white text-blue-600 hover:bg-blue-50 border-0"
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
                    setShowExtrasDialog(true);
                  }}
                  className="h-10 text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 border-0"
                  data-testid="button-leg-bye"
                >
                  LB
                </Button>
                <Button
                  onClick={() => {
                    saveStateForUndo();
                    setExtrasType('b');
                    setShowExtrasDialog(true);
                  }}
                  className="h-10 text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 border-0"
                  data-testid="button-bye"
                >
                  Bye
                </Button>
                <Button
                  onClick={() => {
                    saveStateForUndo();
                    setExtrasType('wd');
                    setShowExtrasDialog(true);
                  }}
                  className="h-10 text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 border-0"
                  data-testid="button-wide"
                >
                  Wide
                </Button>
                <Button
                  onClick={() => {
                    saveStateForUndo();
                    setExtrasType('nb');
                    setShowExtrasDialog(true);
                  }}
                  className="h-10 text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 border-0"
                  data-testid="button-no-ball"
                >
                  NB
                </Button>
                <Button
                  onClick={() => handleRunScored(0)}
                  className="h-10 text-xl font-bold bg-white text-blue-600 hover:bg-blue-50 border-0"
                  data-testid="button-dot"
                >
                  •
                </Button>
              </div>
              
              {/* Bottom Controls */}
              <div className="grid grid-cols-5 gap-1">
                <Button
                  variant="outline"
                  className="h-10 text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 border-0"
                >
                  More
                </Button>
                <Button
                  onClick={() => handleRunScored(0)}
                  className="h-10 font-bold bg-white text-blue-600 hover:bg-blue-50 border-0"
                >
                  <img src="/cricket-ball.svg" alt="ball" className="w-4 h-4" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                  <span className="hidden">0</span>
                </Button>
                <Button
                  className="h-10 text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 border-0"
                >
                  4 5 6 7
                </Button>
                <Button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="h-10 text-xs font-semibold bg-white text-red-600 hover:bg-red-50 border-0"
                  data-testid="button-undo"
                >
                  Undo
                </Button>
                <Button
                  onClick={() => {
                    saveStateForUndo();
                    setShowWicketDialog(true);
                  }}
                  className="h-10 text-xs font-semibold bg-white text-red-600 hover:bg-red-50 border-0"
                  data-testid="button-wicket"
                >
                  Out
                </Button>
              </div>
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
      
      {/* Wicket Dialog */}
      <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Wicket</DialogTitle>
            <DialogDescription>Select dismissal type and details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Who is out?</Label>
              <RadioGroup value={dismissedBatsman} onValueChange={(v) => setDismissedBatsman(v as 'striker' | 'non-striker')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="striker" id="striker" />
                  <Label htmlFor="striker">{matchState.strikeBatsman.name || 'Striker'}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non-striker" id="non-striker" />
                  <Label htmlFor="non-striker">{matchState.nonStrikeBatsman.name || 'Non-striker'}</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label>Dismissal Type</Label>
              <Select value={selectedDismissalType} onValueChange={setSelectedDismissalType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dismissal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bowled">Bowled</SelectItem>
                  <SelectItem value="caught">Caught</SelectItem>
                  <SelectItem value="lbw">LBW</SelectItem>
                  <SelectItem value="run_out">Run Out</SelectItem>
                  <SelectItem value="stumped">Stumped</SelectItem>
                  <SelectItem value="hit_wicket">Hit Wicket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(selectedDismissalType === 'caught' || selectedDismissalType === 'run_out' || selectedDismissalType === 'stumped') && (
              <div>
                <Label>Fielder</Label>
                <Select value={selectedFielder} onValueChange={setSelectedFielder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fielder" />
                  </SelectTrigger>
                    <SelectContent>
                      {bowlingTeamPlayers.map((player, idx) => (
                        <SelectItem key={player.id || `f-${idx}`} value={player.name}>{player.name}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWicketDialog(false)}>Cancel</Button>
              <Button onClick={handleWicket} className="bg-red-600 hover:bg-red-700">Confirm Wicket</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Extras Dialog */}
      <Dialog open={showExtrasDialog} onOpenChange={setShowExtrasDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {extrasType === 'wd' ? 'Wide' : extrasType === 'nb' ? 'No Ball' : extrasType === 'b' ? 'Bye' : 'Leg Bye'}
            </DialogTitle>
            <DialogDescription>Select the number of runs</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4].map(runs => (
              <Button
                key={runs}
                variant={extrasRuns === runs ? "default" : "outline"}
                onClick={() => setExtrasRuns(runs)}
              >
                {runs}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtrasDialog(false)}>Cancel</Button>
            <Button onClick={() => handleExtras(extrasType, extrasRuns)}>Confirm</Button>
          </DialogFooter>
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