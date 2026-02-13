import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from 'wouter';
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
import { useGuestPlayerSync } from '@/hooks/useGuestPlayerSync';
import { offlineSync } from "@/lib/offlineSync";
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
  BallEventRecord,
  ShotDirection,
  ShotDistance
} from '@shared/scoring';
import { ShotDirectionPicker } from '@/components/scoreboard/ShotDirectionPicker';

// Types
interface Player {
  id: string;
  name: string;
  username?: string;    // For registered users - unique username
  guestCode?: string;   // For guest players - 5-char code
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
  return `${overs}.${remainingBalls} `;
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
    const team1Name = localStorage.getItem('myTeamName') || 'Team 1';
    const team2Name = localStorage.getItem('opponentTeamName') || 'Team 2';

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure team names are always set
        return { ...createInitialMatchState(20, true, team1Name, team2Name), ...parsed, team1Name, team2Name };
      } catch {
        return createInitialMatchState(20, true, team1Name, team2Name);
      }
    }

    // Check matchData for toss decision
    const savedMatchData = localStorage.getItem('matchData');
    let team1BattingFirst = true;
    if (savedMatchData) {
      try {
        const matchData = JSON.parse(savedMatchData);
        if (matchData.userTeamRole === 'bowling') {
          team1BattingFirst = false;
        }
      } catch (e) {
        console.error('Error parsing match data', e);
      }
    }

    // Default overs is 20, but will be updated by useEffect if savedConfig exists
    return createInitialMatchState(20, team1BattingFirst, team1Name, team2Name);
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

  // Shot direction tracking state
  const [showShotDirectionPicker, setShowShotDirectionPicker] = useState(false);
  const [skipShotDirection, setSkipShotDirection] = useState(() => {
    return localStorage.getItem('cricscorer_skip_shot_direction') === 'true';
  });
  const [lastBallBatsmanName, setLastBallBatsmanName] = useState('');
  const [lastBallRuns, setLastBallRuns] = useState(0);

  // Phase 8: More menu & Retire dialog
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [retireType, setRetireType] = useState<'retired_hurt' | 'retired_out'>('retired_hurt');
  const [retireWhich, setRetireWhich] = useState<'striker' | 'non-striker'>('striker');
  const [showOverChangeDialog, setShowOverChangeDialog] = useState(false);
  const [newOversValue, setNewOversValue] = useState('');

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
  const [showStrikerSelect, setShowStrikerSelect] = useState(false);
  const [isMatchStarted, setIsMatchStarted] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('scoring');
  const [scorecardTeam, setScorecardTeam] = useState<'batting' | 'bowling'>('batting');

  // Guest player state
  const [guestBatsmanName, setGuestBatsmanName] = useState('');
  const [guestBowlerName, setGuestBowlerName] = useState('');

  // Check if match has already started (current innings has batsmen and bowler selected)
  useEffect(() => {
    // Only consider match started if we have current batsmen and bowler
    const hasStrikeBatsman = matchState.strikeBatsman.id !== '';
    const hasNonStrikeBatsman = matchState.nonStrikeBatsman.id !== '';
    const hasBowler = matchState.currentBowler.id !== '';

    if (hasStrikeBatsman && hasNonStrikeBatsman && hasBowler) {
      setIsMatchStarted(true);
    }
    // Note: We don't set isMatchStarted to false here - that's done by handleInningsEnd
  }, [matchState.strikeBatsman.id, matchState.nonStrikeBatsman.id, matchState.currentBowler.id]);

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
          isOut: false,
          isRetired: false,
          canReturn: false
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

  // Max wickets is always 10 (standard cricket rules)
  // This allows users to add guest players mid-match if team has fewer than 11
  const getMaxWickets = useCallback(() => {
    return 10;
  }, []);

  // Format dismissal text from batsman stats
  const formatDismissal = useCallback((batsman: BatsmanStats): string => {
    if (batsman.isRetired) {
      return batsman.dismissalType === 'retired_hurt' ? 'retired hurt' : 'retired out';
    }
    if (!batsman.isOut) return "not out";
    switch (batsman.dismissalType) {
      case 'bowled': return `b ${batsman.bowler || ''} `;
      case 'caught': return `c ${batsman.fielder || ''} b ${batsman.bowler || ''} `;
      case 'lbw': return `lbw b ${batsman.bowler || ''} `;
      case 'stumped': return `st ${batsman.fielder || ''} b ${batsman.bowler || ''} `;
      case 'run_out': return `run out(${batsman.fielder || ''})`;
      case 'hit_wicket': return `hit wicket b ${batsman.bowler || ''} `;
      case 'retired_hurt': return 'retired hurt';
      case 'retired_out': return 'retired out';
      default: return batsman.dismissalType || '';
    }
  }, []);

  // Get players who did not bat
  const getDidNotBatPlayers = useCallback((teamPlayers: Player[], battingStats: BatsmanStats[]): Player[] => {
    const battedIds = battingStats.map(b => b.id);
    return teamPlayers.filter(p => !battedIds.includes(p.id));
  }, []);

  // Get fall of wickets for specific innings
  const getFallOfWicketsForInnings = useCallback((innings: 1 | 2) => {
    return matchState.fallOfWickets.filter(fow => fow.inningsNumber === innings);
  }, [matchState.fallOfWickets]);

  // Get first innings stats (for End of Innings dialog - when currentInnings is already 2)
  const firstInningsBattingStats = useMemo(() => {
    return matchState.team1BattingFirst ? matchState.team1Batting : matchState.team2Batting;
  }, [matchState.team1BattingFirst, matchState.team1Batting, matchState.team2Batting]);

  const firstInningsBowlingStats = useMemo(() => {
    return matchState.team1BattingFirst ? matchState.team2Bowling : matchState.team1Bowling;
  }, [matchState.team1BattingFirst, matchState.team1Bowling, matchState.team2Bowling]);

  const firstInningsScore = useMemo(() => {
    return matchState.team1BattingFirst ? matchState.team1Score : matchState.team2Score;
  }, [matchState.team1BattingFirst, matchState.team1Score, matchState.team2Score]);

  const firstInningsTeamPlayers = useMemo(() => {
    return matchState.team1BattingFirst ? team1Players : team2Players;
  }, [matchState.team1BattingFirst, team1Players, team2Players]);

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

  // Handle innings end - UI-specific resets
  // Note: Match state (batsmen, bowler, etc.) is already reset by transitionToSecondInnings in scoring.ts
  const handleInningsEnd = useCallback(() => {
    // Reset UI state for the new innings - this shows the bottom panel with SELECT BATSMEN / SELECT BOWLER buttons
    setIsMatchStarted(false);
    setSelectedOpeningBatsmen([]);
    setSelectedOpeningBowler(null);
    setShowEndInningsDialog(false);

    toast({
      title: "Innings Complete",
      description: `Target: ${matchState.target} runs`
    });

    // User will use the bottom panel buttons to select batsmen, bowler, and start 2nd innings
  }, [matchState.target, toast]);

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
  const submitMatchResults = useCallback(async (finalState: any) => { // using any for state to avoid circular type issues if types aren't perfect
    try {
      const performances: any[] = [];
      const team1Id = localStorage.getItem('myTeamId');
      const team2Id = localStorage.getItem('opponentTeamId');
      // Assumption: Team 1 is "My Team" (Home), Team 2 is "Opponent" (Away) usually
      // Better logic: matchState might track teamIds if we added them. Assuming localStorage for local match.

      // Helper to process batting stats
      const processBatting = (stats: any[], teamId: string | null, teamName: string) => {
        stats.forEach(s => {
          // Find existing record or create new
          const existing = performances.find(p => p.playerName === s.name && p.teamName === teamName);
          if (existing) {
            existing.runsScored = s.runs || 0;
            existing.ballsFaced = s.balls || 0;
            existing.fours = s.fours || 0;
            existing.sixes = s.sixes || 0;
            existing.wasDismissed = s.isOut || false;
          } else {
            // Send username for registered users, guestCode for guests
            performances.push({
              playerName: s.name,
              username: s.username || undefined,      // For registered users
              guestCode: s.guestCode || undefined,    // For guest players
              teamId: teamId || undefined,
              teamName,
              runsScored: s.runs || 0,
              ballsFaced: s.balls || 0,
              fours: s.fours || 0,
              sixes: s.sixes || 0,
              wasDismissed: s.isOut || false,
              wicketsTaken: 0,
              oversBowled: 0,
              runsConceded: 0,
              catchesTaken: 0,
              runOuts: 0,
              isManOfTheMatch: false
            });
          }
        });
      };

      // Helper to process bowling stats
      const processBowling = (stats: any[], teamId: string | null, teamName: string) => {
        stats.forEach(s => {
          const existing = performances.find(p => p.playerName === s.name && p.teamName === teamName);
          if (existing) {
            existing.wicketsTaken = s.wickets || 0;
            existing.runsConceded = s.runs || 0;
            existing.oversBowled = parseFloat(s.overs) || 0;
          } else {
            // Send username for registered users, guestCode for guests
            performances.push({
              playerName: s.name,
              username: s.username || undefined,      // For registered users
              guestCode: s.guestCode || undefined,    // For guest players
              teamId: teamId || undefined,
              teamName,
              runsScored: 0,
              ballsFaced: 0,
              fours: 0,
              sixes: 0,
              wasDismissed: false,
              wicketsTaken: s.wickets || 0,
              runsConceded: s.runs || 0,
              oversBowled: parseFloat(s.overs) || 0,
              catchesTaken: 0,
              runOuts: 0,
              isManOfTheMatch: false
            });
          }
        });
      };

      // Process Team 1 (Batting & Bowling)
      // Note: team1Batting is Team 1's batting stats.
      // team1Bowling is Team 1's BOWLING stats (when Team 2 was batting).
      processBatting(finalState.team1Batting, team1Id, finalState.team1Name);
      processBowling(finalState.team1Bowling, team1Id, finalState.team1Name);

      // Process Team 2
      processBatting(finalState.team2Batting, team2Id, finalState.team2Name);
      processBowling(finalState.team2Bowling, team2Id, finalState.team2Name);

      // Determine match result
      let result: 'HOME_WIN' | 'AWAY_WIN' | 'DRAW' = 'DRAW';
      const team1Runs = finalState.team1Score?.runs || 0;
      const team2Runs = finalState.team2Score?.runs || 0;
      if (team1Runs > team2Runs) {
        result = 'HOME_WIN';
      } else if (team2Runs > team1Runs) {
        result = 'AWAY_WIN';
      }

      // Build full payload matching teamMatchResultsSchema
      // Determine which team batted first for proper innings assignment
      const firstBattingTeamExtras = finalState.team1BattingFirst
        ? finalState.team1Score?.extras
        : finalState.team2Score?.extras;
      const secondBattingTeamExtras = finalState.team1BattingFirst
        ? finalState.team2Score?.extras
        : finalState.team1Score?.extras;

      // Filter FOW and partnerships by innings
      const firstInningsFOW = finalState.fallOfWickets?.filter((f: any) => f.inningsNumber === 1) || [];
      const secondInningsFOW = finalState.fallOfWickets?.filter((f: any) => f.inningsNumber === 2) || [];
      const firstInningsPartnerships = finalState.partnerships?.filter((p: any, i: number) => {
        // Partnerships don't have inningsNumber, so we need to infer based on order
        // Count how many partnerships before innings transition
        const firstInningsBatsmenCount = Math.max(
          (finalState.team1BattingFirst ? finalState.team1Batting : finalState.team2Batting)?.length || 0,
          2
        );
        return i < (firstInningsBatsmenCount - 1);
      }) || [];
      const secondInningsPartnerships = finalState.partnerships?.slice(firstInningsPartnerships.length) || [];

      const payload = {
        homeTeamId: team1Id || undefined,
        homeTeamName: finalState.team1Name || 'Team 1',
        awayTeamId: team2Id || undefined,
        awayTeamName: finalState.team2Name || 'Team 2',
        matchDate: new Date().toISOString(),
        venue: localStorage.getItem('matchVenue') || 'Local Ground',
        matchType: localStorage.getItem('matchType') || 'Open Match',
        matchFormat: localStorage.getItem('matchFormat') || 'T20',
        result,
        resultDescription: finalState.result, // e.g., "Team A won by 6 wickets"
        homeTeamRuns: finalState.team1Score?.runs || 0,
        homeTeamWickets: finalState.team1Score?.wickets || 0,
        homeTeamOvers: finalState.team1Score?.balls ? finalState.team1Score.balls / 6 : 0,
        awayTeamRuns: finalState.team2Score?.runs || 0,
        awayTeamWickets: finalState.team2Score?.wickets || 0,
        awayTeamOvers: finalState.team2Score?.balls ? finalState.team2Score.balls / 6 : 0,

        // NEW: Extras breakdown per innings
        firstInningsExtras: firstBattingTeamExtras || { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalty: 0 },
        secondInningsExtras: secondBattingTeamExtras || { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalty: 0 },

        // NEW: Fall of Wickets per innings  
        firstInningsFOW: firstInningsFOW.map((f: any) => ({
          wicket: f.wicketNumber,
          runs: f.score,
          overs: parseFloat(f.overs) || 0,
          batsman: f.batsmanName
        })),
        secondInningsFOW: secondInningsFOW.map((f: any) => ({
          wicket: f.wicketNumber,
          runs: f.score,
          overs: parseFloat(f.overs) || 0,
          batsman: f.batsmanName
        })),

        // NEW: Partnerships per innings
        firstInningsPartnerships: firstInningsPartnerships.map((p: any) => ({
          batsman1: p.batsman1Name,
          batsman2: p.batsman2Name,
          runs: p.totalRuns,
          balls: p.totalBalls
        })),
        secondInningsPartnerships: secondInningsPartnerships.map((p: any) => ({
          batsman1: p.batsman1Name,
          batsman2: p.batsman2Name,
          runs: p.totalRuns,
          balls: p.totalBalls
        })),

        // NEW: Ball-by-ball data for Balls tab
        ballByBallData: finalState.ballHistory || [],

        playerPerformances: performances
      };

      try {
        await apiRequest('POST', '/api/matches/submit-result', payload);
        toast({ title: 'Stats Saved', description: 'Career stats updated successfully.' });
      } catch (e) {
        console.error("Stats submission failed", e);
        // Fallback to offline storage
        offlineSync.savePendingMatch(payload);
        toast({
          title: 'Saved Offline',
          description: 'Connection issue detected. Stats saved locally and will sync when online.'
        });
      }
    } catch (err) {
      console.error("Match processing error", err);
    }
  }, [toast]);

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

    // Debug logging (Phase 8.2)
    console.log('[BALL]', {
      striker: matchState.strikeBatsman.name,
      bowler: matchState.currentBowler.name,
      innings: matchState.currentInnings,
      runs: params.completedRuns,
      extra: params.extraType,
      wicket: params.wicket?.type || null
    });

    // Check for UI triggers (dialogs) before updating state
    const isWicket = params.wicket !== null;
    const isOverComplete = newState.currentBowler.id === '' && matchState.currentBowler.id !== '';

    // Check if innings just transitioned (first innings ended)
    const inningsTransitioned = matchState.currentInnings === 1 && newState.currentInnings === 2;

    // Update local state
    setMatchState(newState);

    // Identify current batting score to check wickets (use new state for innings transition case)
    const currentBattingScore = newState.currentInnings === 1
      ? (newState.team1BattingFirst ? newState.team1Score : newState.team2Score)
      : (newState.team1BattingFirst ? newState.team2Score : newState.team1Score);

    // 8.1 Dialog priority fix: close ALL other dialogs before showing match end
    if (newState.isMatchComplete) {
      setShowBatsmanSelectDialog(false);
      setShowBowlerSelectDialog(false);
      setShowEndInningsDialog(false);
      setShowInlineExtras(false);
      setShowInlineWicket(false);
      await submitMatchResults(newState);
      setShowMatchEndedDialog(true);
      return; // Early return - no other dialogs needed
    }

    if (inningsTransitioned) {
      setShowBatsmanSelectDialog(false);
      setShowBowlerSelectDialog(false);
      setShowEndInningsDialog(true);
    } else if (isWicket && currentBattingScore.wickets < getMaxWickets()) {
      setShowBatsmanSelectDialog(true);
    } else if (isOverComplete) {
      setShowBowlerSelectDialog(true);
    }
  }, [matchState, saveStateForUndo, isMatchStarted, toast, getMaxWickets]);


  // Handle run scored (wrapper for processBall)
  const handleRunScored = useCallback((runs: number) => {
    const isBoundary = runs === 4 || runs === 6;
    processBall({
      completedRuns: runs,
      extraType: 'none',
      wicket: null,
      isBoundary
    });

    // Show shot direction picker for scoring shots (not dot balls)
    if (runs > 0 && !skipShotDirection) {
      setLastBallBatsmanName(matchState.strikeBatsman.name);
      setLastBallRuns(runs);
      setShowShotDirectionPicker(true);
    }
  }, [processBall, skipShotDirection, matchState.strikeBatsman.name]);

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

  // Handle shot direction selection from picker
  const handleShotDirection = useCallback((direction: ShotDirection, distance: ShotDistance) => {
    setMatchState(prev => {
      const updatedHistory = [...prev.ballHistory];
      if (updatedHistory.length > 0) {
        const lastBall = { ...updatedHistory[updatedHistory.length - 1] };
        lastBall.shotDirection = direction;
        lastBall.shotDistance = distance;
        updatedHistory[updatedHistory.length - 1] = lastBall;
      }
      return { ...prev, ballHistory: updatedHistory };
    });
    setShowShotDirectionPicker(false);
  }, []);

  // Handle skip shot direction
  const handleSkipShotDirection = useCallback(() => {
    setShowShotDirectionPicker(false);
  }, []);

  // Toggle skip all shot directions for the match
  const toggleSkipAllShotDirections = useCallback(() => {
    setSkipShotDirection(prev => {
      const newVal = !prev;
      localStorage.setItem('cricscorer_skip_shot_direction', String(newVal));
      return newVal;
    });
  }, []);

  // 8.3 Handle retire batsman
  const handleRetireBatsman = useCallback(() => {
    if (!matchState.strikeBatsman.id && !matchState.nonStrikeBatsman.id) return;

    saveStateForUndo();

    const retiredBatsmanId = retireWhich === 'striker'
      ? matchState.strikeBatsman.id
      : matchState.nonStrikeBatsman.id;

    const isHurt = retireType === 'retired_hurt';

    // Update batting stats - mark as retired (NOT as out, doesn't count as wicket)
    setMatchState(prev => {
      const battingKey = prev.currentInnings === 1
        ? (prev.team1BattingFirst ? 'team1Batting' : 'team2Batting')
        : (prev.team1BattingFirst ? 'team2Batting' : 'team1Batting');

      const updatedBatting = prev[battingKey].map((b: BatsmanStats) => {
        if (b.id === retiredBatsmanId) {
          return {
            ...b,
            isRetired: true,
            canReturn: isHurt, // retired hurt can come back
            dismissalType: retireType
          };
        }
        return b;
      });

      // Clear from crease
      const newState = {
        ...prev,
        [battingKey]: updatedBatting,
      };

      if (retireWhich === 'striker') {
        newState.strikeBatsman = { id: '', name: '' };
      } else {
        newState.nonStrikeBatsman = { id: '', name: '' };
      }

      return newState;
    });

    setShowRetireDialog(false);
    setShowMoreMenu(false);

    // Show batsman selection dialog
    setShowBatsmanSelectDialog(true);

    toast({
      title: isHurt ? "Retired Hurt" : "Retired Out",
      description: `${retireWhich === 'striker' ? matchState.strikeBatsman.name : matchState.nonStrikeBatsman.name} has ${isHurt ? 'retired hurt (can return)' : 'retired out'}`
    });
  }, [matchState, retireWhich, retireType, saveStateForUndo, toast]);

  // 8.4 Handle over change
  const handleOverChange = useCallback(() => {
    const newOvers = parseInt(newOversValue);
    if (isNaN(newOvers) || newOvers < 1 || newOvers > 50) {
      toast({
        title: "Invalid Overs",
        description: "Please enter a valid number between 1 and 50",
        variant: "destructive"
      });
      return;
    }

    const currentBalls = matchState.currentInnings === 1
      ? (matchState.team1BattingFirst ? matchState.team1Score.balls : matchState.team2Score.balls)
      : (matchState.team1BattingFirst ? matchState.team2Score.balls : matchState.team1Score.balls);
    const currentOversPlayed = Math.ceil(currentBalls / 6);

    if (newOvers < currentOversPlayed) {
      toast({
        title: "Invalid Overs",
        description: `Cannot set overs below already bowled (${currentOversPlayed})`,
        variant: "destructive"
      });
      return;
    }

    saveStateForUndo();

    setMatchState(prev => {
      const updated = { ...prev, matchOvers: newOvers };

      // For 2nd innings reduction, recalculate target using simple par score
      if (prev.currentInnings === 2 && prev.target && newOvers < prev.matchOvers) {
        const firstInningsRuns = prev.team1BattingFirst
          ? prev.team1Score.runs
          : prev.team2Score.runs;
        const originalOvers = prev.matchOvers;
        // Simple DLS-like par score: proportional reduction
        const revisedTarget = Math.ceil(firstInningsRuns * (newOvers / originalOvers)) + 1;
        updated.target = revisedTarget;
      }

      return updated;
    });

    setShowOverChangeDialog(false);
    setShowMoreMenu(false);
    setNewOversValue('');

    toast({
      title: "Overs Updated",
      description: `Match overs changed to ${newOvers}`
    });
  }, [matchState, newOversValue, saveStateForUndo, toast]);

  // Select new batsman
  const handleSelectBatsman = useCallback((player: Player) => {
    // Check if batsman has already batted and is out (or retired out)
    const existingStats = currentBattingStats.find(b => b.id === player.id);
    if (existingStats?.isOut) {
      toast({
        title: "Invalid Selection",
        description: "This batsman has already been dismissed",
        variant: "destructive"
      });
      return;
    }
    // Allow retired hurt players to return
    if (existingStats?.isRetired && !existingStats?.canReturn) {
      toast({
        title: "Invalid Selection",
        description: "This batsman has retired out and cannot return",
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
            username: player.username,      // Propagate for stats
            guestCode: player.guestCode,    // Propagate for stats
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            isRetired: false,
            canReturn: false
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

    // Check if end of over and trigger bowler selection instantly
    const balls = battingTeamScore.balls;
    if (balls > 0 && balls % 6 === 0 && balls < matchState.matchOvers * 6) {
      setShowBowlerSelectDialog(true);
    }
  }, [matchState, currentBattingStats, toast, battingTeamScore.balls]);


  // Select bowler
  const handleSelectBowler = useCallback((player: Player) => {
    // Prevent selecting the same bowler for consecutive overs
    const lastBall = matchState.ballHistory.length > 0
      ? matchState.ballHistory[matchState.ballHistory.length - 1]
      : null;

    if (lastBall && player.id === lastBall.bowlerId) {
      toast({
        title: "Invalid Bowler",
        description: "The same bowler cannot bowl two consecutive overs",
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
            username: player.username,      // Propagate for stats
            guestCode: player.guestCode,    // Propagate for stats
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
          isOut: false,
          isRetired: false,
          canReturn: false
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
    <>
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-white z-50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
          {/* Header with Back Button */}
          <div className="bg-blue-600 text-white shrink-0 shadow-md">
            <div className="flex items-center p-3 w-full">
              <Button
                onClick={() => setLocation('/local-match')}
                variant="ghost"
                size="icon"
                data-testid="button-back-to-create-match"
                className="mr-2 text-white hover:bg-blue-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold">Match Centre</h1>
            </div>

            {/* Tabs Navigation */}
            <div className="w-full">
              <div className="px-2">
                <TabsList className="bg-transparent border-b-0 h-auto p-0 w-full justify-start overflow-x-auto scrollbar-hide">
                  <TabsTrigger
                    value="scoring"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-2 text-sm text-blue-100 data-[state=active]:text-white"
                    data-testid="tab-scoring"
                  >
                    Scoring
                  </TabsTrigger>
                  <TabsTrigger
                    value="scorecard"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-2 text-sm text-blue-100 data-[state=active]:text-white"
                    data-testid="tab-scorecard"
                  >
                    Scorecard
                  </TabsTrigger>
                  <TabsTrigger
                    value="stats"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-2 text-sm text-blue-100 data-[state=active]:text-white"
                    data-testid="tab-stats"
                  >
                    Stats
                  </TabsTrigger>
                  <TabsTrigger
                    value="super-stars"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-2 text-sm text-blue-100 data-[state=active]:text-white"
                    data-testid="tab-super-stars"
                  >
                    Stars
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Scoring Tab Content */}
            <TabsContent value="scoring" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
              {/* Score Display Section */}
              <div className="flex-1 p-3 overflow-y-auto">
                <div className="w-full space-y-3">
                  {/* Team and Score Display */}
                  <div className="text-center space-y-1 bg-blue-50 py-4 rounded-2xl border border-blue-100 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-900">
                      {matchState.currentInnings === 1
                        ? (matchState.team1BattingFirst ? matchState.team1Name : matchState.team2Name)
                        : (matchState.team1BattingFirst ? matchState.team2Name : matchState.team1Name)
                      }
                    </h2>
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                      {matchState.currentInnings === 1 ? '1st Innings' : '2nd Innings'}
                    </p>

                    {matchState.isFreeHit && (
                      <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-black animate-pulse inline-block shadow-sm">
                        FREE HIT
                      </div>
                    )}

                    <div className="text-5xl font-black text-blue-600 tabular-nums">
                      {battingTeamScore.runs}-{battingTeamScore.wickets}
                    </div>

                    {/* Match Info Row */}
                    <div className="flex justify-center gap-4 text-xs font-bold text-blue-800">
                      <span className="bg-white px-2 py-1 rounded-lg shadow-sm">Extras: {battingTeamScore.extras.wides + battingTeamScore.extras.noBalls + battingTeamScore.extras.byes + battingTeamScore.extras.legByes}</span>
                      <span className="bg-white px-2 py-1 rounded-lg shadow-sm">Overs: {formatOvers(battingTeamScore.balls)} / {matchState.matchOvers}</span>
                      <span className="bg-white px-2 py-1 rounded-lg shadow-sm">CRR: {battingTeamScore.balls > 0 ? (battingTeamScore.runs / (battingTeamScore.balls / 6)).toFixed(2) : '0.00'}</span>
                      {/* Required Run Rate - only in 2nd innings */}
                      {matchState.currentInnings === 2 && matchState.target && (() => {
                        const remainingRuns = Math.max(0, matchState.target - battingTeamScore.runs);
                        const remainingBalls = Math.max(0, matchState.matchOvers * 6 - battingTeamScore.balls);
                        const rrr = remainingBalls > 0 ? (remainingRuns / (remainingBalls / 6)).toFixed(2) : '0.00';
                        return <span className="bg-white px-2 py-1 rounded-lg shadow-sm">RRR: {rrr}</span>;
                      })()}
                    </div>

                    {/* Partnership */}
                    <div className="text-xs font-medium text-blue-500">
                      Partnership: {getCurrentBatsmanStats(true).runs + getCurrentBatsmanStats(false).runs}({getCurrentBatsmanStats(true).balls + getCurrentBatsmanStats(false).balls})
                    </div>

                    {/* Target Chase Info - only in 2nd innings */}
                    {matchState.currentInnings === 2 && matchState.target && (() => {
                      const remainingRuns = Math.max(0, matchState.target - battingTeamScore.runs);
                      const remainingBalls = Math.max(0, matchState.matchOvers * 6 - battingTeamScore.balls);
                      return (
                        <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold mt-1 inline-block">
                          Target - {matchState.target} | Need {remainingRuns} runs of {remainingBalls} balls
                        </div>
                      );
                    })()}

                    {/* Current Over Display */}
                    {matchState.currentOver.length > 0 && (
                      <div className="flex items-center justify-center gap-2 mt-3 px-4">
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {matchState.currentOver.map((ball, idx) => (
                            <span
                              key={idx}
                              className={`min-w-[28px] h-7 flex items-center justify-center rounded-full text-xs font-bold shadow-sm ${ball === 'W' ? 'bg-red-500 text-white ring-2 ring-red-200' :
                                ball.includes('Wd') || ball.includes('Nb') ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-200' :
                                  ball === '4' || ball === '6' ? 'bg-green-500 text-white ring-2 ring-green-200' :
                                    ball === '0' || ball === '•' ? 'bg-gray-100 text-gray-400 border border-gray-200' :
                                      'bg-blue-600 text-white ring-2 ring-blue-100'
                                }`}
                            >
                              {ball === '•' ? '0' : ball}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Current Batsmen Table */}
                  <div className="space-y-1">
                    <div className="overflow-hidden bg-white rounded-xl border border-blue-100 shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-600 text-white">
                          <tr>
                            <th className="text-left p-2.5 font-bold">Batsman</th>
                            <th className="p-2.5 font-bold">R</th>
                            <th className="p-2.5 font-bold">B</th>
                            <th className="p-2.5 font-bold">4s</th>
                            <th className="p-2.5 font-bold">6s</th>
                            <th className="p-2.5 font-bold">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeBatsmen.length > 0 ? (
                            <>
                              {activeBatsmen.map((batsman, idx) => {
                                const stats = getBatsmanStatsById(batsman.id);
                                const isStriker = batsman.id === matchState.strikeBatsman.id;
                                return (
                                  <tr
                                    key={batsman.id}
                                    className={`transition-colors ${isStriker ? 'bg-blue-50' : 'bg-white'} ${idx === 0 && activeBatsmen.length > 1 ? 'border-b border-blue-50' : ''}`}
                                  >
                                    <td className="p-2.5 font-bold text-blue-900" data-testid={`batsman-${idx + 1}-name`}>
                                      <div className="flex items-center gap-1.5">
                                        {isStriker && <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                                        {batsman.name}
                                        {isStriker && <span className="text-blue-600 ml-1">*</span>}
                                      </div>
                                    </td>
                                    <td className="text-center p-2.5 font-medium tabular-nums">{stats.runs || 0}</td>
                                    <td className="text-center p-2.5 text-gray-500 tabular-nums">{stats.balls || 0}</td>
                                    <td className="text-center p-2.5 text-gray-500 tabular-nums">{stats.fours || 0}</td>
                                    <td className="text-center p-2.5 text-gray-500 tabular-nums">{stats.sixes || 0}</td>
                                    <td className="text-center p-2.5 text-blue-600 font-medium tabular-nums">{stats.strikeRate?.toFixed(1) || '0.0'}</td>
                                  </tr>
                                );
                              })}
                            </>
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-gray-400 italic">No batsmen selected</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Current Bowler Table */}
                  <div className="space-y-1">
                    <div className="overflow-hidden bg-white rounded-xl border border-blue-100 shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-900 text-white">
                          <tr>
                            <th className="text-left p-2.5 font-bold">Bowler</th>
                            <th className="p-2.5 font-bold">O</th>
                            <th className="p-2.5 font-bold">M</th>
                            <th className="p-2.5 font-bold">R</th>
                            <th className="p-2.5 font-bold">W</th>
                            <th className="p-2.5 font-bold">Eco</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-blue-50/30">
                            <td className="p-2.5 font-bold text-blue-900" data-testid="bowler-name">
                              {matchState.currentBowler.name || selectedOpeningBowler?.name || 'Select Bowler'}
                            </td>
                            <td className="text-center p-2.5 font-medium tabular-nums">{getCurrentBowlerStats().overs || '0.0'}</td>
                            <td className="text-center p-2.5 text-gray-500 tabular-nums">0</td>
                            <td className="text-center p-2.5 text-gray-500 tabular-nums">{getCurrentBowlerStats().runs || 0}</td>
                            <td className="text-center p-2.5 font-bold text-red-600 tabular-nums">{getCurrentBowlerStats().wickets || 0}</td>
                            <td className="text-center p-2.5 text-blue-600 font-medium tabular-nums">{getCurrentBowlerStats().economy?.toFixed(1) || '0.0'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Panel - Fixed at bottom */}
              <div className="bg-white border-t border-blue-100 p-3 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <div className="w-full space-y-3">
                  {!isMatchStarted ? (
                    <div className="space-y-3">
                      <h3 className="text-blue-900 font-black text-center text-lg">READY TO SCORE?</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => setShowInitialBatsmanSelect(true)}
                          className={`h-14 text-sm font-black border-2 rounded-2xl transition-all ${selectedOpeningBatsmen.length === 2
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                            }`}
                          data-testid="button-select-batsman-panel"
                        >
                          {selectedOpeningBatsmen.length === 2 ? '✓ BATSMEN READY' : 'SELECT BATSMEN'}
                        </Button>
                        <Button
                          onClick={() => setShowInitialBowlerSelect(true)}
                          className={`h-14 text-sm font-black border-2 rounded-2xl transition-all ${selectedOpeningBowler
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                            }`}
                          data-testid="button-select-bowler-panel"
                        >
                          {selectedOpeningBowler ? '✓ BOWLER READY' : 'SELECT BOWLER'}
                        </Button>
                      </div>
                      {/* Show START MATCH button when both batsmen and bowler are selected */}
                      {selectedOpeningBatsmen.length === 2 && selectedOpeningBowler && (
                        <Button
                          onClick={() => {
                            setIsMatchStarted(true);
                            toast({
                              title: "Match Started!",
                              description: `${matchState.strikeBatsman.name} is on strike. Let's go! 🏏`,
                            });
                          }}
                          className="w-full h-14 text-lg font-black bg-green-600 text-white rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 transition-all"
                          data-testid="button-start-match"
                        >
                          🏏 START MATCH
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {showInlineExtras ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="flex items-center justify-between px-1">
                            <h3 className="text-blue-600 font-black text-base uppercase tracking-wider">
                              {extrasType === 'wd' ? 'Wide' : extrasType === 'nb' ? 'No Ball' : extrasType === 'b' ? 'Bye' : 'Leg Bye'} Runs
                            </h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowInlineExtras(false)}
                              className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {[0, 1, 2, 3, 4].map(runs => (
                              <Button
                                key={runs}
                                onClick={() => handleExtras(extrasType, runs)}
                                className="h-14 text-xl font-black bg-blue-600 text-white rounded-2xl shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                              >
                                {runs}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : showInlineWicket ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="flex items-center justify-between px-1">
                            <h3 className="text-red-600 font-black text-base uppercase tracking-wider">
                              {wicketStep === 'how' ? 'How was out?' : wicketStep === 'fielder' ? 'Select Fielder' : 'Run Out Details'}
                            </h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowInlineWicket(false);
                                setWicketStep('how');
                              }}
                              className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                          </div>

                          {wicketStep === 'how' && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 justify-center bg-gray-50 p-2 rounded-xl">
                                <Button
                                  size="sm"
                                  variant={dismissedBatsman === 'striker' ? "default" : "outline"}
                                  onClick={() => setDismissedBatsman('striker')}
                                  className={`flex-1 h-10 rounded-lg font-bold ${dismissedBatsman === 'striker' ? "bg-red-600 text-white" : "border-red-100 text-red-600 bg-white"}`}
                                >
                                  {matchState.strikeBatsman.name || 'Striker'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={dismissedBatsman === 'non-striker' ? "default" : "outline"}
                                  onClick={() => setDismissedBatsman('non-striker')}
                                  className={`flex-1 h-10 rounded-lg font-bold ${dismissedBatsman === 'non-striker' ? "bg-red-600 text-white" : "border-red-100 text-red-600 bg-white"}`}
                                >
                                  {matchState.nonStrikeBatsman.name || 'Non-Striker'}
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
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
                                    className="h-12 text-xs font-black bg-red-600 text-white rounded-xl shadow-md hover:bg-red-700 active:scale-95 transition-all"
                                  >
                                    {type.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {wicketStep === 'fielder' && (
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                              {bowlingTeamPlayers.map(player => (
                                <Button
                                  key={player.id}
                                  onClick={() => {
                                    setSelectedFielder(player.name);
                                    handleInlineWicketSubmit(selectedDismissalType, player.name);
                                  }}
                                  className="h-12 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm truncate"
                                >
                                  {player.name}
                                </Button>
                              ))}
                            </div>
                          )}

                          {wicketStep === 'runout_details' && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <span className="text-xs font-black text-blue-900 block text-center uppercase">Completed Runs</span>
                                <div className="flex gap-2 justify-center">
                                  {[0, 1, 2, 3].map(runs => (
                                    <Button
                                      key={runs}
                                      onClick={() => setRunoutCompletedRuns(runs)}
                                      className={`h-12 w-14 text-lg font-black rounded-xl transition-all ${runoutCompletedRuns === runs ? "bg-blue-600 text-white shadow-lg" : "bg-blue-50 text-blue-600 border border-blue-100"}`}
                                    >
                                      {runs}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                <Button
                                  onClick={() => handleInlineWicketSubmit('run_out', undefined)}
                                  className="h-12 text-xs font-black bg-gray-500 text-white rounded-xl col-span-2"
                                >
                                  NO FIELDER (CONTINUE)
                                </Button>
                                {bowlingTeamPlayers.map(player => (
                                  <Button
                                    key={player.id}
                                    onClick={() => {
                                      setSelectedFielder(player.name);
                                      handleInlineWicketSubmit('run_out', player.name);
                                    }}
                                    className="h-12 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm truncate"
                                  >
                                    {player.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Main Controls Grid */}
                          <div className="grid grid-cols-4 gap-2">
                            {/* Dot Ball & Singles */}
                            <Button
                              onClick={() => handleRunScored(0)}
                              className="h-14 text-2xl font-black bg-gray-100 text-gray-400 border-2 border-gray-200 rounded-2xl hover:bg-gray-200 transition-all"
                              data-testid="button-dot"
                            >
                              0
                            </Button>
                            <Button
                              onClick={() => handleRunScored(1)}
                              className="h-14 text-2xl font-black bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
                              data-testid="button-runs-1"
                            >
                              1
                            </Button>
                            <Button
                              onClick={() => handleRunScored(2)}
                              className="h-14 text-2xl font-black bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
                              data-testid="button-runs-2"
                            >
                              2
                            </Button>
                            <Button
                              onClick={() => handleRunScored(3)}
                              className="h-14 text-2xl font-black bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
                              data-testid="button-runs-3"
                            >
                              3
                            </Button>

                            {/* Boundaries */}
                            <Button
                              onClick={() => handleRunScored(4)}
                              className="h-14 text-2xl font-black bg-green-600 text-white rounded-2xl shadow-lg shadow-green-100 active:scale-95 transition-all"
                              data-testid="button-runs-4"
                            >
                              4
                            </Button>
                            <Button
                              onClick={() => handleRunScored(6)}
                              className="h-14 text-2xl font-black bg-green-600 text-white rounded-2xl shadow-lg shadow-green-100 active:scale-95 transition-all"
                              data-testid="button-runs-6"
                            >
                              6
                            </Button>

                            {/* Extras Entry */}
                            <Button
                              onClick={() => {
                                saveStateForUndo();
                                setExtrasType('wd');
                                setShowInlineExtras(true);
                              }}
                              className="h-14 text-sm font-black bg-yellow-400 text-yellow-900 rounded-2xl shadow-lg shadow-yellow-100 active:scale-95 transition-all"
                              data-testid="button-wide"
                            >
                              WIDE
                            </Button>
                            <Button
                              onClick={() => {
                                saveStateForUndo();
                                setExtrasType('nb');
                                setShowInlineExtras(true);
                              }}
                              className="h-14 text-sm font-black bg-yellow-400 text-yellow-900 rounded-2xl shadow-lg shadow-yellow-100 active:scale-95 transition-all"
                              data-testid="button-no-ball"
                            >
                              NB
                            </Button>

                            {/* Functional Buttons */}
                            <Button
                              onClick={() => {
                                saveStateForUndo();
                                setExtrasType('lb');
                                setShowInlineExtras(true);
                              }}
                              className="h-14 text-sm font-black bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl hover:bg-blue-100 active:scale-95 transition-all"
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
                              className="h-14 text-sm font-black bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl hover:bg-blue-100 active:scale-95 transition-all"
                              data-testid="button-bye"
                            >
                              BYE
                            </Button>
                            {/* More Menu Button */}
                            <div className="relative">
                              <Button
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                className="h-14 w-full text-sm font-black bg-gray-900 text-white rounded-2xl shadow-lg active:scale-95 transition-all"
                                data-testid="button-more"
                              >
                                <ChevronDown className="w-4 h-4 mr-1" />
                                MORE
                              </Button>
                              {showMoreMenu && (
                                <div className="absolute bottom-16 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                                  <button
                                    onClick={() => { handleUndo(); setShowMoreMenu(false); }}
                                    disabled={undoStack.length === 0}
                                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Undo2 className="w-4 h-4" /> Undo Last Ball
                                  </button>
                                  <button
                                    onClick={() => { setShowRetireDialog(true); setShowMoreMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center gap-3 border-t border-gray-100"
                                  >
                                    <Minus className="w-4 h-4" /> Retire Batsman
                                  </button>
                                  <button
                                    onClick={() => { setShowOverChangeDialog(true); setNewOversValue(String(matchState.matchOvers)); setShowMoreMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center gap-3 border-t border-gray-100"
                                  >
                                    <Settings className="w-4 h-4" /> Change Overs
                                  </button>
                                  <button
                                    onClick={() => { rotateStrike(); setShowMoreMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center gap-3 border-t border-gray-100"
                                  >
                                    <RotateCcw className="w-4 h-4" /> Swap Strike
                                  </button>
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => {
                                saveStateForUndo();
                                setShowInlineWicket(true);
                                setWicketStep('how');
                              }}
                              className="h-14 text-sm font-black bg-red-600 text-white rounded-2xl shadow-lg shadow-red-100 active:scale-95 transition-all"
                              data-testid="button-wicket"
                            >
                              OUT
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Scorecard Tab Content */}
            <TabsContent value="scorecard" className="flex-1 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto">
                {/* Team Toggle */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setScorecardTeam('batting')}
                    className={`flex-1 py-3 text-sm font-bold transition-all ${scorecardTeam === 'batting'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {localStorage.getItem('myTeamName') || 'Team 1'}
                  </button>
                  <button
                    onClick={() => setScorecardTeam('bowling')}
                    className={`flex-1 py-3 text-sm font-bold transition-all ${scorecardTeam === 'bowling'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {localStorage.getItem('opponentTeamName') || 'Team 2'}
                  </button>
                </div>

                <div className="p-4 space-y-6">
                  {/* Batting Section */}
                  <div>
                    <h3 className="text-blue-600 font-bold text-sm mb-2">Batsman</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-blue-600 border-b border-gray-200">
                            <th className="text-left py-2 font-bold">Batsman</th>
                            <th className="py-2 font-bold w-10">R</th>
                            <th className="py-2 font-bold w-10">B</th>
                            <th className="py-2 font-bold w-10">4s</th>
                            <th className="py-2 font-bold w-10">6s</th>
                            <th className="py-2 font-bold w-12">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentBattingStats.map((batsman, idx) => {
                            const isOut = batsman.isOut;
                            const isAtCrease = !isOut && (batsman.id === matchState.strikeBatsman.id || batsman.id === matchState.nonStrikeBatsman.id);
                            const dismissalInfo = isOut ? (batsman as any).dismissalText || 'out' : 'batting';
                            return (
                              <tr key={batsman.id || idx} className="border-b border-gray-100">
                                <td className="py-3">
                                  <div className="font-medium text-gray-900">{batsman.name}</div>
                                  <div className={`text-xs ${isAtCrease ? 'text-blue-600 font-medium' : 'text-gray-400 italic'}`}>
                                    {isAtCrease ? 'batting' : dismissalInfo}
                                  </div>
                                </td>
                                <td className="text-center py-3 font-bold">{batsman.runs}</td>
                                <td className="text-center py-3 text-gray-500">{batsman.balls}</td>
                                <td className="text-center py-3 text-gray-500">{batsman.fours}</td>
                                <td className="text-center py-3 text-gray-500">{batsman.sixes}</td>
                                <td className="text-center py-3 text-gray-500">{batsman.strikeRate?.toFixed(1) || '0.0'}</td>
                              </tr>
                            );
                          })}
                          {currentBattingStats.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-gray-400 italic">No batting data yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Extras and Total */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Extras</span>
                      <span className="font-medium">
                        {battingTeamScore.extras.wides + battingTeamScore.extras.noBalls + battingTeamScore.extras.byes + battingTeamScore.extras.legByes}
                        <span className="text-xs text-gray-400 ml-2">
                          (WD {battingTeamScore.extras.wides}, NB {battingTeamScore.extras.noBalls}, B {battingTeamScore.extras.byes}, LB {battingTeamScore.extras.legByes})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-blue-600">Total</span>
                      <span className="text-blue-600">{battingTeamScore.runs}/{battingTeamScore.wickets}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Overs</span>
                      <span>{formatOvers(battingTeamScore.balls)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Run Rate</span>
                      <span>{battingTeamScore.balls > 0 ? (battingTeamScore.runs / (battingTeamScore.balls / 6)).toFixed(2) : '0.00'}</span>
                    </div>
                  </div>

                  {/* Bowling Section */}
                  <div>
                    <h3 className="text-blue-600 font-bold text-sm mb-2">Bowler</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-blue-600 border-b border-gray-200">
                            <th className="text-left py-2 font-bold">Bowler</th>
                            <th className="py-2 font-bold w-10">O</th>
                            <th className="py-2 font-bold w-10">M</th>
                            <th className="py-2 font-bold w-10">R</th>
                            <th className="py-2 font-bold w-10">W</th>
                            <th className="py-2 font-bold w-12">Eco</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentBowlingStats.map((bowler, idx) => (
                            <tr key={bowler.id || idx} className="border-b border-gray-100">
                              <td className="py-3 font-medium text-gray-900">{bowler.name}</td>
                              <td className="text-center py-3">{bowler.overs}</td>
                              <td className="text-center py-3 text-gray-500">{bowler.maidens || 0}</td>
                              <td className="text-center py-3 text-gray-500">{bowler.runs}</td>
                              <td className="text-center py-3 font-bold">{bowler.wickets}</td>
                              <td className="text-center py-3 text-gray-500">{bowler.economy?.toFixed(1) || '0.0'}</td>
                            </tr>
                          ))}
                          {currentBowlingStats.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-gray-400 italic">No bowling data yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Fall of Wickets */}
                  {matchState.fallOfWickets && matchState.fallOfWickets.length > 0 && (
                    <div>
                      <h3 className="text-blue-600 font-bold text-sm mb-2">Fall of Wickets</h3>
                      <div className="space-y-2">
                        {matchState.fallOfWickets.map((fow) => (
                          <div key={fow.wicketNumber} className="flex justify-between text-sm py-1 border-b border-gray-100">
                            <span className="text-gray-600">
                              <span className="font-bold text-gray-900 mr-2">{fow.wicketNumber}</span>
                              {fow.batsmanName}
                            </span>
                            <span className="text-gray-500">{fow.score} ({fow.overs})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Partnership */}
                  {matchState.currentPartnership && (
                    <div>
                      <h3 className="text-blue-600 font-bold text-sm mb-2">Current Partnership</h3>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="font-medium text-gray-900">{matchState.currentPartnership.batsman1Name}</div>
                            <div className="text-sm text-gray-500">
                              {matchState.currentPartnership.batsman1Runs}({matchState.currentPartnership.batsman1Balls})
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                              {matchState.currentPartnership.totalRuns}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              {matchState.currentPartnership.totalBalls} Balls
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">{matchState.currentPartnership.batsman2Name}</div>
                            <div className="text-sm text-gray-500">
                              {matchState.currentPartnership.batsman2Runs}({matchState.currentPartnership.batsman2Balls})
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Stats Tab Content - Placeholder */}
            <TabsContent value="stats" className="flex-1 m-0 p-4 data-[state=inactive]:hidden">
              <div className="text-center text-gray-500 py-10">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Stats coming soon...</p>
              </div>
            </TabsContent>

            {/* Super Stars Tab Content - Placeholder */}
            <TabsContent value="super-stars" className="flex-1 m-0 p-4 data-[state=inactive]:hidden">
              <div className="text-center text-gray-500 py-10">
                <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Super Stars coming soon...</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Dialogs */}

        {/* Initial Batsman Selection - Full Page */}
        {
          showInitialBatsmanSelect && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white">
              {/* Header */}
              <div className="bg-blue-600 text-white p-4 shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowInitialBatsmanSelect(false)}
                    className="text-white hover:bg-blue-700"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-bold">Select Opening Batsmen</h1>
                    <p className="text-blue-100 text-sm">Select 2 batsmen to open the innings</p>
                  </div>
                </div>
                {/* Selection indicator */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-blue-100 text-sm">Selected:</span>
                  <span className="bg-white text-blue-600 font-bold px-3 py-1 rounded-full text-sm">
                    {selectedOpeningBatsmen.length} / 2
                  </span>
                </div>
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto p-4 bg-blue-50">
                <div className="space-y-2">
                  {battingTeamPlayers.map((player, idx) => (
                    <Button
                      key={player.id || `p1-${idx}`}
                      variant={selectedOpeningBatsmen.find(p => p.id === player.id) ? "default" : "outline"}
                      className={`w-full justify-start h-14 text-base font-medium rounded-xl ${selectedOpeningBatsmen.find(p => p.id === player.id)
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                        : 'bg-white border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-400 text-blue-900'
                        }`}
                      onClick={() => handleSelectOpeningBatsman(player)}
                      data-testid={`select-batsman-${player.id}`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedOpeningBatsmen.find(p => p.id === player.id)
                          ? 'bg-white text-blue-600'
                          : 'bg-blue-100 text-blue-400'
                          }`}>
                          {selectedOpeningBatsmen.find(p => p.id === player.id) ? '✓' : (idx + 1)}
                        </div>
                        <span>{player.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bottom - Add Guest Player */}
              <div className="bg-white border-t-2 border-blue-100 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <p className="text-sm font-bold text-blue-900 mb-3">Add Guest Player</p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter guest player name"
                    value={guestBatsmanName}
                    onChange={(e) => setGuestBatsmanName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGuestBatsman()}
                    className="flex-1 h-12 border-2 border-blue-200 focus:border-blue-400 rounded-xl text-base"
                  />
                  <Button
                    onClick={handleAddGuestBatsman}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-5 rounded-xl font-bold"
                  >
                    <Plus className="h-5 w-5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        {/* Initial Bowler Selection - Full Page */}
        {
          showInitialBowlerSelect && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white">
              {/* Header */}
              <div className="bg-blue-600 text-white p-4 shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowInitialBowlerSelect(false)}
                    className="text-white hover:bg-blue-700"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-bold">Select Opening Bowler</h1>
                    <p className="text-blue-100 text-sm">Select the bowler to start the innings</p>
                  </div>
                </div>
                {/* Selection indicator */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-blue-100 text-sm">Selected:</span>
                  <span className="bg-white text-blue-600 font-bold px-3 py-1 rounded-full text-sm">
                    {selectedOpeningBowler ? '1 / 1' : '0 / 1'}
                  </span>
                </div>
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto p-4 bg-blue-50">
                <div className="space-y-2">
                  {bowlingTeamPlayers.map((player, idx) => (
                    <Button
                      key={player.id || `p2-${idx}`}
                      variant={selectedOpeningBowler?.id === player.id ? "default" : "outline"}
                      className={`w-full justify-start h-14 text-base font-medium rounded-xl ${selectedOpeningBowler?.id === player.id
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                        : 'bg-white border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-400 text-blue-900'
                        }`}
                      onClick={() => handleSelectOpeningBowler(player)}
                      data-testid={`select-bowler-${player.id}`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedOpeningBowler?.id === player.id
                          ? 'bg-white text-blue-600'
                          : 'bg-blue-100 text-blue-400'
                          }`}>
                          {selectedOpeningBowler?.id === player.id ? '✓' : (idx + 1)}
                        </div>
                        <span>{player.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bottom - Add Guest Player */}
              <div className="bg-white border-t-2 border-blue-100 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <p className="text-sm font-bold text-blue-900 mb-3">Add Guest Player</p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter guest player name"
                    value={guestBowlerName}
                    onChange={(e) => setGuestBowlerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGuestBowler()}
                    className="flex-1 h-12 border-2 border-blue-200 focus:border-blue-400 rounded-xl text-base"
                  />
                  <Button
                    onClick={handleAddGuestBowler}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-5 rounded-xl font-bold"
                  >
                    <Plus className="h-5 w-5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        {/* Striker Selection - Full Page */}
        {
          showStrikerSelect && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white">
              {/* Header */}
              <div className="bg-blue-600 text-white p-4 shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowStrikerSelect(false)}
                    className="text-white hover:bg-blue-700"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-bold">Select Striker</h1>
                    <p className="text-blue-100 text-sm">Who will face the first ball?</p>
                  </div>
                </div>
              </div>

              {/* Selected Batsmen List */}
              <div className="flex-1 overflow-y-auto p-4 bg-blue-50">
                <div className="space-y-4">
                  <p className="text-blue-900 font-bold text-center mb-4">
                    Tap on the batsman who will take strike first
                  </p>
                  {selectedOpeningBatsmen.map((player, idx) => (
                    <Button
                      key={player.id}
                      className="w-full justify-center h-20 text-xl font-bold rounded-2xl bg-white border-2 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-900 shadow-lg transition-all"
                      onClick={() => {
                        // Set the selected player as striker, the other as non-striker
                        const striker = player;
                        const nonStriker = selectedOpeningBatsmen.find(p => p.id !== player.id)!;

                        setMatchState(prev => ({
                          ...prev,
                          strikeBatsman: { id: striker.id, name: striker.name },
                          nonStrikeBatsman: { id: nonStriker.id, name: nonStriker.name }
                        }));

                        setShowStrikerSelect(false);
                        setIsMatchStarted(true);

                        toast({
                          title: "Match Started!",
                          description: `${striker.name} is on strike. Let's go! 🏏`,
                        });
                      }}
                      data-testid={`select-striker-${player.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-lg">
                          {idx + 1}
                        </div>
                        <span>{player.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bottom Info */}
              <div className="bg-white border-t-2 border-blue-100 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <div className="text-center text-blue-600 font-medium">
                  <p className="text-sm">🎯 Opening Bowler: <span className="font-bold">{selectedOpeningBowler?.name}</span></p>
                </div>
              </div>
            </div>
          )
        }

        {/* Batsman Selection - Full Page (after wicket) */}
        {
          showBatsmanSelectDialog && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white">
              {/* Header */}
              <div className="bg-blue-600 text-white p-4 shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowBatsmanSelectDialog(false)}
                    className="text-white hover:bg-blue-700"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-bold">Select New Batsman</h1>
                    <p className="text-blue-100 text-sm">Select the next batsman to come in</p>
                  </div>
                </div>
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto p-4 bg-blue-50">
                <div className="space-y-2">
                  {getAvailableBatsmen().map((player, idx) => (
                    <Button
                      key={player.id || `p3-${idx}`}
                      variant="outline"
                      className="w-full justify-start h-14 text-base font-medium rounded-xl bg-white border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-400 text-blue-900"
                      onClick={() => handleSelectBatsman(player)}
                      data-testid={`select-new-batsman-${player.id}`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-100 text-blue-400">
                          {idx + 1}
                        </div>
                        <span>{player.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bottom - Add Guest Player */}
              <div className="bg-white border-t-2 border-blue-100 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <p className="text-sm font-bold text-blue-900 mb-3">Add Guest Player</p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter guest player name"
                    value={guestBatsmanName}
                    onChange={(e) => setGuestBatsmanName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGuestBatsman()}
                    className="flex-1 h-12 border-2 border-blue-200 focus:border-blue-400 rounded-xl text-base"
                  />
                  <Button
                    onClick={handleAddGuestBatsman}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-5 rounded-xl font-bold"
                  >
                    <Plus className="h-5 w-5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        {/* Bowler Selection - Full Page (for next over) */}
        {
          showBowlerSelectDialog && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white">
              {/* Header */}
              <div className="bg-blue-600 text-white p-4 shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowBowlerSelectDialog(false)}
                    className="text-white hover:bg-blue-700"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-bold">Select Bowler</h1>
                    <p className="text-blue-100 text-sm">Select the bowler for the next over</p>
                  </div>
                </div>
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto p-4 bg-blue-50">
                <div className="space-y-2">
                  {bowlingTeamPlayers.map((player, idx) => {
                    const bowlerStats = currentBowlingStats.find(b => b.id === player.id);
                    const isCurrentBowler = matchState.currentBowler.id === player.id;
                    return (
                      <Button
                        key={player.id || `p4-${idx}`}
                        variant={isCurrentBowler ? "default" : "outline"}
                        className={`w-full justify-start h-14 text-base font-medium rounded-xl ${isCurrentBowler
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                          : 'bg-white border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-400 text-blue-900'
                          }`}
                        onClick={() => handleSelectBowler(player)}
                        data-testid={`select-next-bowler-${player.id}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCurrentBowler ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-400'
                              }`}>
                              {isCurrentBowler ? '✓' : (idx + 1)}
                            </div>
                            <span>{player.name}</span>
                          </div>
                          {bowlerStats && (
                            <span className={`text-sm ${isCurrentBowler ? 'text-blue-100' : 'text-blue-500'}`}>
                              {bowlerStats.overs || '0.0'} overs
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom - Add Guest Player */}
              <div className="bg-white border-t-2 border-blue-100 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <p className="text-sm font-bold text-blue-900 mb-3">Add Guest Player</p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter guest player name"
                    value={guestBowlerName}
                    onChange={(e) => setGuestBowlerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGuestBowler()}
                    className="flex-1 h-12 border-2 border-blue-200 focus:border-blue-400 rounded-xl text-base"
                  />
                  <Button
                    onClick={handleAddGuestBowler}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-5 rounded-xl font-bold"
                  >
                    <Plus className="h-5 w-5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        {/* End Innings Full-Page Scorecard */}
        {showEndInningsDialog && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 shrink-0">
              <div className="text-center">
                <h1 className="text-lg font-bold">
                  {matchState.team1BattingFirst ? matchState.team1Name : matchState.team2Name}
                </h1>
                <p className="text-3xl font-black">
                  {firstInningsScore.runs}/{firstInningsScore.wickets}
                  <span className="text-lg font-normal text-blue-200 ml-2">
                    ({formatOvers(firstInningsScore.balls)} ov)
                  </span>
                </p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-white pb-20">
              {/* Batting Section */}
              <div className="px-2 py-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-blue-600 text-xs bg-blue-50">
                      <th className="text-left p-2">Batting</th>
                      <th className="p-1 text-center">R</th>
                      <th className="p-1 text-center">B</th>
                      <th className="p-1 text-center">4s</th>
                      <th className="p-1 text-center">6s</th>
                      <th className="p-1 text-center">S/R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firstInningsBattingStats.map((batsman, idx) => (
                      <tr key={batsman.id || idx} className="border-b border-blue-100">
                        <td className="p-2">
                          <div className="text-blue-900 font-medium">{batsman.name}</div>
                          <div className="text-gray-500 text-xs">{formatDismissal(batsman)}</div>
                        </td>
                        <td className="p-1 text-center text-blue-900 font-bold">{batsman.runs}</td>
                        <td className="p-1 text-center text-gray-600">{batsman.balls}</td>
                        <td className="p-1 text-center text-gray-600">{batsman.fours}</td>
                        <td className="p-1 text-center text-gray-600">{batsman.sixes}</td>
                        <td className="p-1 text-center text-gray-600">{batsman.strikeRate.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Extras */}
                <div className="flex justify-between text-gray-600 text-sm p-2 border-b border-blue-100">
                  <span>Extras</span>
                  <span>
                    {firstInningsScore.extras.wides + firstInningsScore.extras.noBalls + firstInningsScore.extras.byes + firstInningsScore.extras.legByes}
                    {' '}(W {firstInningsScore.extras.wides}, NB {firstInningsScore.extras.noBalls}, B {firstInningsScore.extras.byes}, LB {firstInningsScore.extras.legByes})
                  </span>
                </div>

                {/* Total */}
                <div className="flex justify-between text-blue-900 font-bold text-sm p-2 border-b border-blue-100 bg-blue-50">
                  <span>Total runs</span>
                  <span>{firstInningsScore.runs} ({firstInningsScore.wickets} wkts, {formatOvers(firstInningsScore.balls)} ov)</span>
                </div>

                {/* Did Not Bat */}
                {(() => {
                  const didNotBat = getDidNotBatPlayers(firstInningsTeamPlayers, firstInningsBattingStats);
                  if (didNotBat.length === 0) return null;
                  return (
                    <div className="p-2 text-gray-600 text-sm border-b border-blue-100">
                      <span className="font-medium">Did not bat: </span>
                      {didNotBat.map(p => p.name).join(' · ')}
                    </div>
                  );
                })()}

                {/* Fall of Wickets */}
                {(() => {
                  const fow = getFallOfWicketsForInnings(1);
                  if (fow.length === 0) return null;
                  return (
                    <div className="p-2 text-gray-600 text-sm border-b border-blue-100">
                      <div className="font-medium mb-1 text-blue-900">Fall of wickets</div>
                      <div className="text-xs">
                        {fow.map((f, idx) => (
                          <span key={idx}>
                            {f.score}/{f.wicketNumber} ({f.batsmanName}, {f.overs} ov)
                            {idx < fow.length - 1 ? ' · ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Bowling Section */}
                <div className="mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-blue-600 text-xs bg-blue-50">
                        <th className="text-left p-2">Bowling</th>
                        <th className="p-1 text-center">O</th>
                        <th className="p-1 text-center">M</th>
                        <th className="p-1 text-center">R</th>
                        <th className="p-1 text-center">W</th>
                        <th className="p-1 text-center">Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firstInningsBowlingStats.map((bowler, idx) => (
                        <tr key={bowler.id || idx} className="border-b border-blue-100">
                          <td className="p-2 text-blue-900 font-medium">{bowler.name}</td>
                          <td className="p-1 text-center text-gray-600">{bowler.overs}</td>
                          <td className="p-1 text-center text-gray-600">{bowler.maidens}</td>
                          <td className="p-1 text-center text-gray-600">{bowler.runs}</td>
                          <td className="p-1 text-center text-blue-900 font-bold">{bowler.wickets}</td>
                          <td className="p-1 text-center text-gray-600">{bowler.economy.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-100 p-4 shadow-lg">
              <Button
                onClick={handleInningsEnd}
                className="w-full h-14 text-lg font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                Start 2nd Innings
              </Button>
            </div>
          </div>
        )}

        {/* Match Ended Full-Page Scorecard */}
        {showMatchEndedDialog && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Header with Result */}
            <div className="bg-blue-600 text-white p-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-2xl font-black tabular-nums">
                    {matchState.team1Score.runs}/{matchState.team1Score.wickets}
                  </p>
                  <p className="text-xs text-blue-200">({formatOvers(matchState.team1Score.balls)})</p>
                </div>
                <div className="text-center flex-1 px-2">
                  <p className="text-xs text-white font-bold">{matchState.result}</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-2xl font-black tabular-nums">
                    {matchState.team2Score.runs}/{matchState.team2Score.wickets}
                  </p>
                  <p className="text-xs text-blue-200">({formatOvers(matchState.team2Score.balls)})</p>
                </div>
              </div>

              {/* Team Tabs */}
              <div className="flex mt-4 border-b border-blue-500">
                <button
                  onClick={() => setScorecardTeam('batting')}
                  className={`flex-1 py-2 text-sm font-bold transition-all ${scorecardTeam === 'batting'
                    ? 'text-white border-b-2 border-white'
                    : 'text-blue-200'
                    }`}
                >
                  {matchState.team1Name}
                </button>
                <button
                  onClick={() => setScorecardTeam('bowling')}
                  className={`flex-1 py-2 text-sm font-bold transition-all ${scorecardTeam === 'bowling'
                    ? 'text-white border-b-2 border-white'
                    : 'text-blue-200'
                    }`}
                >
                  {matchState.team2Name}
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-white pb-20">
              {(() => {
                // Determine which team's stats to show based on tab
                const isTeam1 = scorecardTeam === 'batting';
                const battingStats = isTeam1
                  ? (matchState.team1BattingFirst ? matchState.team1Batting : matchState.team2Batting)
                  : (matchState.team1BattingFirst ? matchState.team2Batting : matchState.team1Batting);
                const bowlingStats = isTeam1
                  ? (matchState.team1BattingFirst ? matchState.team2Bowling : matchState.team1Bowling)
                  : (matchState.team1BattingFirst ? matchState.team1Bowling : matchState.team2Bowling);
                const teamScore = isTeam1 ? matchState.team1Score : matchState.team2Score;
                const teamPlayers = isTeam1 ? team1Players : team2Players;
                const inningsNum = isTeam1
                  ? (matchState.team1BattingFirst ? 1 : 2)
                  : (matchState.team1BattingFirst ? 2 : 1);
                const fow = matchState.fallOfWickets.filter(f => f.inningsNumber === inningsNum);

                return (
                  <div className="px-2 py-2">
                    {/* Batting Section */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-blue-600 text-xs bg-blue-50">
                          <th className="text-left p-2">Batting</th>
                          <th className="p-1 text-center">R</th>
                          <th className="p-1 text-center">B</th>
                          <th className="p-1 text-center">4s</th>
                          <th className="p-1 text-center">6s</th>
                          <th className="p-1 text-center">S/R</th>
                        </tr>
                      </thead>
                      <tbody>
                        {battingStats.map((batsman, idx) => (
                          <tr key={batsman.id || idx} className="border-b border-blue-100">
                            <td className="p-2">
                              <div className="text-blue-900 font-medium">{batsman.name}</div>
                              <div className="text-gray-500 text-xs">{formatDismissal(batsman)}</div>
                            </td>
                            <td className="p-1 text-center text-blue-900 font-bold">{batsman.runs}</td>
                            <td className="p-1 text-center text-gray-600">{batsman.balls}</td>
                            <td className="p-1 text-center text-gray-600">{batsman.fours}</td>
                            <td className="p-1 text-center text-gray-600">{batsman.sixes}</td>
                            <td className="p-1 text-center text-gray-600">{batsman.strikeRate.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Extras */}
                    <div className="flex justify-between text-gray-600 text-sm p-2 border-b border-blue-100">
                      <span>Extras</span>
                      <span>
                        {teamScore.extras.wides + teamScore.extras.noBalls + teamScore.extras.byes + teamScore.extras.legByes}
                        {' '}(W {teamScore.extras.wides}, NB {teamScore.extras.noBalls}, B {teamScore.extras.byes}, LB {teamScore.extras.legByes})
                      </span>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between text-blue-900 font-bold text-sm p-2 border-b border-blue-100 bg-blue-50">
                      <span>Total runs</span>
                      <span>{teamScore.runs} ({teamScore.wickets} wkts, {formatOvers(teamScore.balls)} ov)</span>
                    </div>

                    {/* Did Not Bat */}
                    {(() => {
                      const didNotBat = getDidNotBatPlayers(teamPlayers, battingStats);
                      if (didNotBat.length === 0) return null;
                      return (
                        <div className="p-2 text-gray-600 text-sm border-b border-blue-100">
                          <span className="font-medium">Did not bat: </span>
                          {didNotBat.map(p => p.name).join(' · ')}
                        </div>
                      );
                    })()}

                    {/* Fall of Wickets */}
                    {fow.length > 0 && (
                      <div className="p-2 text-gray-600 text-sm border-b border-blue-100">
                        <div className="font-medium mb-1 text-blue-900">Fall of wickets</div>
                        <div className="text-xs">
                          {fow.map((f, idx) => (
                            <span key={idx}>
                              {f.score}/{f.wicketNumber} ({f.batsmanName}, {f.overs} ov)
                              {idx < fow.length - 1 ? ' · ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bowling Section */}
                    <div className="mt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-blue-600 text-xs bg-blue-50">
                            <th className="text-left p-2">Bowling</th>
                            <th className="p-1 text-center">O</th>
                            <th className="p-1 text-center">M</th>
                            <th className="p-1 text-center">R</th>
                            <th className="p-1 text-center">W</th>
                            <th className="p-1 text-center">Econ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bowlingStats.map((bowler, idx) => (
                            <tr key={bowler.id || idx} className="border-b border-blue-100">
                              <td className="p-2 text-blue-900 font-medium">{bowler.name}</td>
                              <td className="p-1 text-center text-gray-600">{bowler.overs}</td>
                              <td className="p-1 text-center text-gray-600">{bowler.maidens}</td>
                              <td className="p-1 text-center text-gray-600">{bowler.runs}</td>
                              <td className="p-1 text-center text-blue-900 font-bold">{bowler.wickets}</td>
                              <td className="p-1 text-center text-gray-600">{bowler.economy.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-100 p-4 shadow-lg">
              <Button
                onClick={() => setLocation('/local-match')}
                className="w-full h-14 text-lg font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Shot Direction Picker Dialog */}
      <ShotDirectionPicker
        isOpen={showShotDirectionPicker}
        onSelect={handleShotDirection}
        onSkip={handleSkipShotDirection}
        batsmanName={lastBallBatsmanName}
        runs={lastBallRuns}
      />

      {/* Retire Batsman Dialog */}
      <Dialog open={showRetireDialog} onOpenChange={setShowRetireDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retire Batsman</DialogTitle>
            <DialogDescription>
              Select which batsman to retire and the retirement type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Which batsman */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Which Batsman?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={retireWhich === 'striker' ? 'default' : 'outline'}
                  onClick={() => setRetireWhich('striker')}
                  className={retireWhich === 'striker' ? 'bg-blue-600' : ''}
                >
                  {matchState.strikeBatsman.name || 'Striker'}
                </Button>
                <Button
                  variant={retireWhich === 'non-striker' ? 'default' : 'outline'}
                  onClick={() => setRetireWhich('non-striker')}
                  className={retireWhich === 'non-striker' ? 'bg-blue-600' : ''}
                >
                  {matchState.nonStrikeBatsman.name || 'Non-Striker'}
                </Button>
              </div>
            </div>
            {/* Retirement type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Retirement Type</Label>
              <RadioGroup value={retireType} onValueChange={(v) => setRetireType(v as any)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="retired_hurt" id="retired_hurt" />
                  <Label htmlFor="retired_hurt" className="flex-1 cursor-pointer">
                    <div className="font-medium">Retired Hurt</div>
                    <div className="text-xs text-muted-foreground">Injury — can return to bat later</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="retired_out" id="retired_out" />
                  <Label htmlFor="retired_out" className="flex-1 cursor-pointer">
                    <div className="font-medium">Retired Out</div>
                    <div className="text-xs text-muted-foreground">Strategic — cannot return</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetireDialog(false)}>Cancel</Button>
            <Button onClick={handleRetireBatsman} className="bg-red-600 hover:bg-red-700 text-white">
              Confirm Retire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Overs Dialog */}
      <Dialog open={showOverChangeDialog} onOpenChange={setShowOverChangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Match Overs</DialogTitle>
            <DialogDescription>
              Adjust the total overs for this match.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-muted-foreground">Current Overs</div>
                <div className="text-2xl font-bold">{matchState.matchOvers}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-muted-foreground">Overs Bowled</div>
                <div className="text-2xl font-bold">
                  {(() => {
                    const balls = matchState.currentInnings === 1
                      ? (matchState.team1BattingFirst ? matchState.team1Score.balls : matchState.team2Score.balls)
                      : (matchState.team1BattingFirst ? matchState.team2Score.balls : matchState.team1Score.balls);
                    return `${Math.floor(balls / 6)}.${balls % 6}`;
                  })()}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-overs">New Overs</Label>
              <Input
                id="new-overs"
                type="number"
                min={1}
                max={50}
                value={newOversValue}
                onChange={(e) => setNewOversValue(e.target.value)}
                className="text-lg font-bold text-center"
              />
            </div>
            {matchState.currentInnings === 2 && matchState.target && parseInt(newOversValue) < matchState.matchOvers && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
                <div className="font-medium text-amber-800">⚠️ Target will be revised</div>
                <div className="text-amber-700 mt-1">
                  Original Target: <strong>{matchState.target}</strong> →
                  Revised Target: <strong>{Math.ceil(
                    (matchState.team1BattingFirst ? matchState.team1Score.runs : matchState.team2Score.runs)
                    * (parseInt(newOversValue) / matchState.matchOvers)
                  ) + 1}</strong>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverChangeDialog(false)}>Cancel</Button>
            <Button onClick={handleOverChange} className="bg-blue-600 hover:bg-blue-700 text-white">
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
