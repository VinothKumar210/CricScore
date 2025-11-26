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
export function calculateManOfTheMatch(
  performances: PlayerPerformance[], 
  matchFormat: 'T20' | 'ODI' | 'TEST' = 'T20'
): ManOfTheMatchResult | null {
  if (performances.length === 0) return null;

  const playerScores: ManOfTheMatchResult[] = [];

  return null;
}

for (const performance of performances) {
  const breakdown = {
    battingPoints: 0,
    bowlingPoints: 0,
    fieldingPoints: 0,
    bonuses: [] as string[],
  };
  breakdown.battingPoints = performance.runsScored;
  if (performance.runsScored >= 100) {
    breakdown.battingPoints += 40;
    breakdown.bonuses.push('Century Bonus (+40)');
  } else if (performance.runsScored >= 50) {
    breakdown.battingPoints += 20;
    breakdown.bonuses.push('Half-Century Bonus (+20)');
  }
  if ((matchFormat === 'T20' || matchFormat === 'ODI') && performance.ballsFaced > 0) {
    const strikeRate = (performance.runsScored / performance.ballsFaced) * 100;
    if (strikeRate >= 150) {
      breakdown.battingPoints += 20;
      breakdown.bonuses.push('Excellent Strike Rate 150+ (+20)');
    } else if (strikeRate >= 130) {
      breakdown.battingPoints += 10;
      breakdown.bonuses.push('Good Strike Rate 130+ (+10)');
    }
  }
}

breakdown.bowlingPoints = performance.wicketsTaken * 25;
if (performance.wicketsTaken >= 5) {
  breakdown.bowlingPoints += 30;
  breakdown.bonuses.push('5-Wicket Haul Bonus (+30)');
} else if (performance.wicketsTaken >= 3) {
  breakdown.bowlingPoints += 15;
  breakdown.bonuses.push('3-Wicket Haul Bonus (+15)');
}

if ((matchFormat === 'T20' || matchFormat === 'ODI') && performance.oversBowled > 0) {
  const wholeOvers = Math.floor(performance.oversBowled);
  const balls = Math.round((performance.oversBowled - wholeOvers) * 10);
  const decimalOvers = wholeOvers + balls / 6;
  const economy = performance.runsConceded / decimalOvers;

  if (economy <= 5) {
    breakdown.bowlingPoints += 20;
    breakdown.bonuses.push('Excellent Economy ≤5.0 (+20)');
  } else if (economy <= 6) {
    breakdown.bowlingPoints += 10;
    breakdown.bonuses.push('Good Economy ≤6.0 (+10)');
  }
}


breakdown.fieldingPoints = performance.catchesTaken * 10;
if (performance.runsOut) {
  breakdown.fieldingPoints += performance.runsOut * 15;
}

const performanceScore = breakdown.battingPoints + breakdown.bowlingPoints + breakdown.fieldingPoints;

playerScores.push({
  playerId: performance.userId,
  playerName: performance.playerName,
  performanceScore,
  breakdown
});
