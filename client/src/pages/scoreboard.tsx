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
import { 
  processBall as sharedProcessBall, 
  initialMatchState as createInitialMatchState,
  MatchState,
  ExtraType,
  WicketEvent,
  DismissalType,
  BatsmanStats,
  BowlerStats,
  TeamScore,
  BallEventRecord
} from '@shared/scoring';

// Types
interface Player {
  id: string;
  name: string;
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
  const processBall = useCallback(async (params: {
    completedRuns: number;
    extraType: ExtraType;
    wicket: WicketEvent | null;
    isBoundary?: boolean;
  }) => {
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

    // Use the shared scoring logic
    const newState = sharedProcessBall(matchState, params);
    
    // Check for UI triggers (dialogs) before updating state
    const isWicket = params.wicket !== null;
    const isOverComplete = newState.currentOver.length === 0 && matchState.currentOver.length > 0;
    
    // Update local state
    setMatchState(newState);

    // Sync with backend if possible
    const localMatchId = localStorage.getItem("localMatchId");
    if (localMatchId) {
      try {
        await apiRequest("POST", `/api/local-matches/${localMatchId}/ball`, {
          ...params
        });
      } catch (error) {
        console.error("Failed to sync ball with backend:", error);
      }
    }

      // Show dialogs if necessary
      if (!newState.isMatchComplete) {
        if (isWicket && newState.team1Score.wickets < getMaxWickets()) {
          setTimeout(() => setShowBatsmanSelectDialog(true), 150);
        } else if (!newState.currentBowler.id) {
          setTimeout(() => setShowBowlerSelectDialog(true), 150);
        }
      } else {
        setShowMatchEndedDialog(true);
      }

  }, [matchState, saveStateForUndo, isMatchStarted, toast, getMaxWickets]);


    // Handle score (runs, extras, wickets)
    const handleScore = useCallback((runs: number, isExtra: boolean = false, extraType?: string, isWicket: boolean = false) => {
      if (isWicket) {
        setShowWicketDialog(true);
        return;
      }
      
      if (isExtra) {
        const typeMap: Record<string, ExtraType> = {
          'wd': 'wide',
          'nb': 'noball',
          'by': 'bye',
          'lb': 'legbye'
        };
        processBall({
          completedRuns: runs,
          extraType: typeMap[extraType || ''] || 'none',
          wicket: null,
          isBoundary: false
        });
      } else {
        processBall({
          completedRuns: runs,
          extraType: 'none',
          wicket: null,
          isBoundary: runs === 4 || runs === 6
        });
      }
    }, [processBall]);

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

      // If current bowler is empty (end of over), trigger bowler selection
      if (!matchState.currentBowler.id) {
        setTimeout(() => setShowBowlerSelectDialog(true), 300);
      }
    }, [matchState, currentBattingStats, toast]);

  
  // Select bowler
  const handleSelectBowler = useCallback((player: Player) => {
    // Prevent consecutive overs from same bowler
    if (matchState.lastBowlerId === player.id) {
      toast({
        title: "Invalid Selection",
        description: "A bowler cannot bowl two consecutive overs",
        variant: "destructive"
      });
      return;
    }

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
        currentBowler: { id: player.id, name: player.name },
        currentOver: []
      }));
      
      setShowBowlerSelectDialog(false);
    }, [currentBowlingStats, matchState.lastBowlerId, toast]);

  
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
          currentBowler: { id: player.id, name: player.name },
          currentOver: []
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
            <div className="flex-1 overflow-hidden">
              <TabsContent value="scoring" className="h-full m-0 flex flex-col overflow-hidden">
                {/* Main Content Area - White background for score display */}
                <div className="flex-1 flex flex-col bg-white overflow-y-auto">
                  {/* Score Display Section */}
                  <div className="p-2 sm:p-3">
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
                  </div>

                  {/* Scoring Controls Section */}
                  <div className="shrink-0 bg-gray-50 border-t border-gray-200 p-2 sm:p-3">
                    <div className="max-w-6xl mx-auto space-y-2 sm:space-y-3">
                      {/* Main Score Buttons */}
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
                        {[0, 1, 2, 3, 4, 6].map((num) => (
                          <Button
                            key={num}
                            onClick={() => handleScore(num)}
                            disabled={!isMatchStarted || matchState.isMatchEnded}
                            variant="outline"
                            className="h-10 sm:h-12 text-base sm:text-lg font-bold border-blue-200 hover:bg-blue-600 hover:text-white transition-all"
                            data-testid={`score-${num}`}
                          >
                            {num}
                          </Button>
                        ))}
                        <Button
                          onClick={() => handleScore(0, false, null, true)}
                          disabled={!isMatchStarted || matchState.isMatchEnded}
                          variant="destructive"
                          className="h-10 sm:h-12 text-sm sm:text-base font-bold"
                          data-testid="score-wicket"
                        >
                          W
                        </Button>
                      </div>

                      {/* Extras and Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-1.5 sm:gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleScore(1, true, 'wd')}
                            disabled={!isMatchStarted || matchState.isMatchEnded}
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-[10px] sm:text-xs h-8"
                            data-testid="score-wide"
                          >
                            Wd
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleScore(1, true, 'nb')}
                            disabled={!isMatchStarted || matchState.isMatchEnded}
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-[10px] sm:text-xs h-8"
                            data-testid="score-noball"
                          >
                            Nb
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleScore(1, true, 'by')}
                            disabled={!isMatchStarted || matchState.isMatchEnded}
                            className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200 text-[10px] sm:text-xs h-8"
                          >
                            By
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleScore(1, true, 'lb')}
                            disabled={!isMatchStarted || matchState.isMatchEnded}
                            className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200 text-[10px] sm:text-xs h-8"
                          >
                            Lb
                          </Button>
                        </div>

                        <div className="flex gap-1.5 sm:gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                            className="text-gray-500 hover:text-gray-700 h-8 px-2"
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            <span className="text-[10px] sm:text-xs">Undo</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowEndInningsDialog(true)}
                            disabled={matchState.currentInnings === 2 || matchState.isMatchEnded}
                            className="text-blue-600 hover:text-blue-700 h-8 px-2"
                          >
                            End Innings
                          </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    </TabsContent>

              <TabsContent value="scorecard" className="flex-1 overflow-auto bg-gray-50 p-3">
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-blue-600 text-white p-3 font-bold flex justify-between">
                      <span>Scorecard</span>
                      <span>{battingTeamScore.runs}/{battingTeamScore.wickets} ({formatOvers(battingTeamScore.balls)})</span>
                    </div>
                    <div className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-2">Batter</th>
                            <th className="text-right p-2">R</th>
                            <th className="text-right p-2">B</th>
                            <th className="text-right p-2">4s</th>
                            <th className="text-right p-2">6s</th>
                            <th className="text-right p-2">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentBattingStats.map((stats) => (
                            <tr key={stats.id} className="border-b">
                              <td className="p-2">
                                <div className="font-medium">{stats.name}</div>
                                <div className="text-xs text-gray-500">{stats.isOut ? 'out' : 'not out'}</div>
                              </td>
                              <td className="text-right p-2">{stats.runs}</td>
                              <td className="text-right p-2">{stats.balls}</td>
                              <td className="text-right p-2">{stats.fours}</td>
                              <td className="text-right p-2">{stats.sixes}</td>
                              <td className="text-right p-2">{stats.strikeRate.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

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
                  {bowlingTeamPlayers.map((player, idx) => {
                    const isLastBowler = matchState.lastBowlerId === player.id;
                    const stats = currentBowlingStats.find(b => b.id === player.id);
                    
                    return (
                      <Button
                        key={player.id || `p4-${idx}`}
                        variant={matchState.currentBowler.id === player.id ? "default" : "outline"}
                        disabled={isLastBowler}
                        className={`w-full justify-between ${
                          matchState.currentBowler.id === player.id 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : isLastBowler
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'border-blue-200 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                        onClick={() => handleSelectBowler(player)}
                        data-testid={`select-next-bowler-${player.id}`}
                      >
                        <span className="flex items-center gap-2">
                          {player.name}
                          {isLastBowler && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Last Over</span>}
                        </span>
                        {stats && (
                          <span className="text-[10px] opacity-70">
                            {stats.overs} ov • {stats.wickets} wk
                          </span>
                        )}
                      </Button>
                    );
                  })}
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
