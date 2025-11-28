import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { type LocalPlayer } from '@shared/schema';

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

interface BowlerStats {
  player: LocalPlayer;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
}

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

export default function BowlerSelection() {
  const [, setLocation] = useLocation();

  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [battingScore, setBattingScore] = useState<TeamScore | null>(null);
  const [bowlerStats, setBowlerStats] = useState<BowlerStats[]>([]);
  const [previousBowler, setPreviousBowler] = useState<LocalPlayer | null>(null);

  useEffect(() => {
    const savedMatch = localStorage.getItem('currentMatchState');
    const savedScore = localStorage.getItem('currentBattingTeamScore');
    const savedBowlerStats = localStorage.getItem('currentBowlerStats');
    const savedPrev = localStorage.getItem('currentPreviousBowler');

    if (savedMatch) setMatchState(JSON.parse(savedMatch));
    else setLocation('/scoreboard');

    if (savedScore) setBattingScore(JSON.parse(savedScore));
    if (savedBowlerStats) setBowlerStats(JSON.parse(savedBowlerStats));
    if (savedPrev) setPreviousBowler(JSON.parse(savedPrev));
  }, [setLocation]);

  if (!matchState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold">Bowler Selection</h1>
    </div>
  );
}
