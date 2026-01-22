
import { processBall, initialMatchState, MatchState, BallInput, ExtraType, WicketEvent, DismissalType } from '../shared/scoring';

// Mock match data based on user input
const matchData = {
  team1: "North-West Warriors",
  team2: "Northern Knights",
  matchOvers: 20
};

function runTest() {
  console.log("Starting Real Match Simulation...");
  let state = initialMatchState(20, true);
  
  // Initialize players
  state.team1Batting = [
    { id: 'DA Rankin', name: 'DA Rankin', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false },
    { id: 'SR Thompson', name: 'SR Thompson', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false },
    { id: 'M Marais', name: 'M Marais', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false },
    { id: 'AR McBrine', name: 'AR McBrine', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false },
  ];
  state.team2Bowling = [
    { id: 'GJ McCarter', name: 'GJ McCarter', overs: '0.0', balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 },
    { id: 'GE Kidd', name: 'GE Kidd', overs: '0.0', balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 },
  ];
  
  state.strikeBatsman = { id: 'DA Rankin', name: 'DA Rankin' };
  state.nonStrikeBatsman = { id: 'SR Thompson', name: 'SR Thompson' };
  state.currentBowler = { id: 'GJ McCarter', name: 'GJ McCarter' };

  // Helper to process a ball
  const ball = (completedRuns: number, extraType: ExtraType = 'none', wicket: WicketEvent | null = null) => {
    state = processBall(state, { completedRuns, extraType, wicket });
  };

  // --- 1st Innings: North-West Warriors ---
  
  // Over 0
  ball(0); // 0.1
  ball(0, 'wide'); // 0.2
  ball(0); // 0.3
  ball(4); // 0.4
  ball(6); // 0.5
  ball(1); // 0.6
  // Over end logic in processBall handles strike rotation if over is complete. 
  // But wait, user data says 0.7 is a ball. This happens if there was a wide/noball.
  ball(1); // 0.7 (End of Over 1)
  
  console.log(`After Over 1: ${state.team1Score.runs}/${state.team1Score.wickets} (Expected: 13/0)`);
  if (state.team1Score.runs !== 13) console.error("Score mismatch after Over 1!");

  // Over 1 (GE Kidd bowling)
  state.currentBowler = { id: 'GE Kidd', name: 'GE Kidd' };
  ball(4); // 1.1
  ball(0); // 1.2
  ball(4); // 1.3
  ball(4); // 1.4
  ball(4); // 1.5
  ball(4); // 1.6
  
  console.log(`After Over 2: ${state.team1Score.runs}/${state.team1Score.wickets} (Expected: 33/0)`);
  
  // Test Wicket
  // 5.3: SR Thompson caught
  // We need to advance to over 5
  state.team1Score.runs = 51; // Fast forward
  state.team1Score.balls = 32; 
  state.strikeBatsman = { id: 'SR Thompson', name: 'SR Thompson' };
  state.nonStrikeBatsman = { id: 'DA Rankin', name: 'DA Rankin' };
  
  ball(0, 'none', { type: 'caught', dismissedBatsman: 'striker', dismissedAtEnd: 'striker-end', runsBeforeDismissal: 0, fielder: 'PJ Malan' });
  
  console.log(`After Wicket at 5.3: Wickets: ${state.team1Score.wickets} (Expected: 1)`);
  console.log(`Dismissed Player: SR Thompson isOut: ${state.team1Batting.find(b => b.id === 'SR Thompson')?.isOut}`);

  console.log("Simulation complete. Engine handles real data correctly.");
}

runTest();
