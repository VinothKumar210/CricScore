// Man of the Match calculation utility
// Based on the scoring system provided by the user

export interface PlayerPerformance {
  userId?: string;
  playerName: string;
  runsScored: number;
  ballsFaced: number;
  oversBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  catchesTaken: number;
  runsOut?: number; // For run-outs/stumpings
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

  for (const performance of performances) {
    const breakdown = {
      battingPoints: 0,
      bowlingPoints: 0,
      fieldingPoints: 0,
      bonuses: [] as string[]
    };

    // 🏏 Batting Points Calculation
    breakdown.battingPoints = performance.runsScored; // +1 point per run

    // Batting bonuses
    if (performance.runsScored >= 100) {
      breakdown.battingPoints += 40; // +40 bonus for century
      breakdown.bonuses.push('Century Bonus (+40)');
    } else if (performance.runsScored >= 50) {
      breakdown.battingPoints += 20; // +20 bonus for half-century
      breakdown.bonuses.push('Half-Century Bonus (+20)');
    }

    // Strike rate bonus (for T20/ODI only)
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

    // 🎯 Bowling Points Calculation
    breakdown.bowlingPoints = performance.wicketsTaken * 25; // +25 points per wicket

    // Bowling bonuses
    if (performance.wicketsTaken >= 5) {
      breakdown.bowlingPoints += 30; // +30 bonus for 5-wicket haul
      breakdown.bonuses.push('5-Wicket Haul Bonus (+30)');
    } else if (performance.wicketsTaken >= 3) {
      breakdown.bowlingPoints += 15; // +15 bonus for 3-wicket haul
      breakdown.bonuses.push('3-Wicket Haul Bonus (+15)');
    }

    // Economy bonus (for T20/ODI only)
    if ((matchFormat === 'T20' || matchFormat === 'ODI') && performance.oversBowled > 0) {
      // Convert cricket overs (e.g., 3.2) to decimal overs (e.g., 3.33)
      const wholeOvers = Math.floor(performance.oversBowled);
      const balls = Math.round((performance.oversBowled - wholeOvers) * 10);
      const decimalOvers = wholeOvers + (balls / 6);
      
      const economy = performance.runsConceded / decimalOvers;
      
      if (economy <= 5) {
        breakdown.bowlingPoints += 20;
        breakdown.bonuses.push('Excellent Economy ≤5.0 (+20)');
      } else if (economy <= 6) {
        breakdown.bowlingPoints += 10;
        breakdown.bonuses.push('Good Economy ≤6.0 (+10)');
      }
    }

    // 🧤 Fielding Points Calculation
    breakdown.fieldingPoints = performance.catchesTaken * 10; // +10 per catch
    if (performance.runsOut) {
      breakdown.fieldingPoints += performance.runsOut * 15; // +15 per run-out/stumping
    }

    // Calculate total performance score
    const performanceScore = breakdown.battingPoints + breakdown.bowlingPoints + breakdown.fieldingPoints;

    playerScores.push({
      playerId: performance.userId,
      playerName: performance.playerName,
      performanceScore,
      breakdown
    });
  }

  // Sort by performance score (highest first)
  playerScores.sort((a, b) => b.performanceScore - a.performanceScore);

  // Return the player with the highest score
  return playerScores[0];
}

// Utility function to get a formatted breakdown string
export function getPerformanceBreakdown(result: ManOfTheMatchResult): string {
  const { breakdown } = result;
  const parts = [];
  
  if (breakdown.battingPoints > 0) {
    parts.push(`Batting: ${breakdown.battingPoints} pts`);
  }
  
  if (breakdown.bowlingPoints > 0) {
    parts.push(`Bowling: ${breakdown.bowlingPoints} pts`);
  }
  
  if (breakdown.fieldingPoints > 0) {
    parts.push(`Fielding: ${breakdown.fieldingPoints} pts`);
  }
  
  if (breakdown.bonuses.length > 0) {
    parts.push(`Bonuses: ${breakdown.bonuses.join(', ')}`);
  }
  
  return parts.join(' | ');
}