export interface PlayerPerformance {
  userId?: string;
  playerName: string;
  runsScored: number;
  ballsFaced: number;
  oversBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  catchesTaken: number;
  runsOut?: number; 
}

export interface ManOfTheMatchResult {
  playerId?: string;
  playerName: string;
  performanceScore: number;
  breakdown: {
    battingPoints: number;
    bowlingPoints: number;
    fieldingPoints: number;
    bonuses: string[];
  };
}
