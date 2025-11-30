import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
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

export default function BowlerSelection() {
  const [, setLocation] = useLocation();
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [battingTeamScore, setBattingTeamScore] = useState<TeamScore>({
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }
  });
  const [bowlerStats, setBowlerStats] = useState<BowlerStats[]>([]);
  const [previousBowler, setPreviousBowler] = useState<LocalPlayer | null>(null);

  useEffect(() => {
    // Load all necessary state from localStorage
    const savedMatchState = localStorage.getItem('currentMatchState');
    const savedBattingTeamScore = localStorage.getItem('currentBattingTeamScore');
    const savedBowlerStats = localStorage.getItem('currentBowlerStats');
    const savedPreviousBowler = localStorage.getItem('currentPreviousBowler');

    if (savedMatchState) {
      setMatchState(JSON.parse(savedMatchState));
    }
    if (savedBattingTeamScore) {
      setBattingTeamScore(JSON.parse(savedBattingTeamScore));
    }
    if (savedBowlerStats) {
      setBowlerStats(JSON.parse(savedBowlerStats));
    }
    if (savedPreviousBowler) {
      setPreviousBowler(JSON.parse(savedPreviousBowler));
    }

    // If no match state, redirect back to scoreboard
    if (!savedMatchState) {
      setLocation('/scoreboard');
    }
  }, [setLocation]);

  const selectNewBowler = (newBowler: LocalPlayer) => {
    // Check if bowler already exists in stats, if not add them
    const updatedBowlerStats = (() => {
      const existingBowler = bowlerStats.find(stat => stat.player.name === newBowler.name);
      if (existingBowler) {
        // Bowler already exists, just return existing stats
        return bowlerStats;
      } else {
        // New bowler, add to stats
        return [
          ...bowlerStats,
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
    })();
    
    // Update match state with new bowler
    const updatedMatchState = matchState ? {
      ...matchState,
      currentBowler: newBowler
    } : null;
    
    // Save updated state to localStorage
    if (updatedMatchState) {
      localStorage.setItem('currentMatchState', JSON.stringify(updatedMatchState));
    }
    localStorage.setItem('currentBowlerStats', JSON.stringify(updatedBowlerStats));
    localStorage.setItem('bowlerSelected', 'true');
    
    // Navigate back to scoreboard
    setLocation('/scoreboard');
  };

  if (!matchState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Determine which team is bowling
  const userTeamBatsFirst = matchState.userTeamRole.includes('batting');
  const bowlingTeamPlayers = (userTeamBatsFirst ? matchState.opponentTeamPlayers : matchState.myTeamPlayers)
    .filter(player => player.name && player.name.trim() !== '');

  // Strict bowling selection - exclude current bowler and previous bowler
  const availableBowlers = bowlingTeamPlayers.filter((player: LocalPlayer) => {
    // Always exclude current bowler (cannot bowl consecutive balls)
    if (player.name === matchState?.currentBowler.name) return false;
    
    // Always exclude previous bowler to prevent consecutive overs (except first over)
    if (previousBowler && player.name === previousBowler.name && battingTeamScore.balls > 0) return false;
    
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/scoreboard')}
            data-testid="button-back-scoreboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {matchState?.currentInnings === 2 && !matchState.currentBowler.name 
              ? "Select Opening Bowler (Second Innings)"
              : "Select Next Bowler"}
          </h1>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {matchState?.currentInnings === 2 && !matchState.currentBowler.name 
                ? "Select Opening Bowler (Second Innings)"
                : "Select Next Bowler"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}