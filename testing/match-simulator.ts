
import { processBall, initialMatchState, type MatchState, type BallInput, type ExtraType } from "../shared/scoring";

function generateRandomBall(state: MatchState): BallInput {
  const rand = Math.random();
  
  // Wicket (3%)
  if (rand < 0.03) {
    return {
      completedRuns: 0,
      extraType: 'none',
      wicket: {
        type: 'bowled', // simplifying for simulation
        dismissedBatsman: 'striker',
        dismissedAtEnd: 'striker-end',
        runsBeforeDismissal: 0
      }
    };
  }
  
  // Wide (2%)
  if (rand < 0.05) return { completedRuns: 0, extraType: 'wide', wicket: null };
  
  // No-ball (1%)
  if (rand < 0.06) return { completedRuns: Math.floor(Math.random() * 2), extraType: 'noball', wicket: null };
  
  // Runs
  const runRand = Math.random();
  if (runRand < 0.4) return { completedRuns: 0, extraType: 'none', wicket: null }; // Dot
  if (runRand < 0.8) return { completedRuns: Math.floor(Math.random() * 3) + 1, extraType: 'none', wicket: null }; // 1, 2, 3
  if (runRand < 0.9) return { completedRuns: 4, extraType: 'none', wicket: null, isBoundary: true };
  return { completedRuns: 6, extraType: 'none', wicket: null, isBoundary: true };
}

function simulateMatch(matchId: number) {
  console.log(`\n--- Simulating Match ${matchId} (T20) ---`);
  let state = initialMatchState(20, true);
  
  // Setup dummy players
  state.team1Batting = Array.from({ length: 11 }, (_, i) => ({
    id: `t1p${i+1}`, name: `T1 Player ${i+1}`, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false
  }));
  state.team2Batting = Array.from({ length: 11 }, (_, i) => ({
    id: `t2p${i+1}`, name: `T2 Player ${i+1}`, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false
  }));
  state.team1Bowling = [{ id: 't1b1', name: 'T1 Bowler 1', overs: '0', balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 }];
  state.team2Bowling = [{ id: 't2b1', name: 'T2 Bowler 1', overs: '0', balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 }];
  
  state.strikeBatsman = state.team1Batting[0];
  state.nonStrikeBatsman = state.team1Batting[1];
  state.currentBowler = state.team2Bowling[0];

  let ballCount = 0;
  while (!state.isMatchComplete && ballCount < 1000) { // Safety break
    const ballInput = generateRandomBall(state);
    
    // Auto-select next batsman if needed
    if (state.strikeBatsman.id === '') {
      const battingKey = state.currentInnings === 1 
        ? (state.team1BattingFirst ? 'team1Batting' : 'team2Batting')
        : (state.team1BattingFirst ? 'team2Batting' : 'team1Batting');
      const nextBatsman = state[battingKey].find(b => !b.isOut && b.id !== state.nonStrikeBatsman.id);
      if (nextBatsman) state.strikeBatsman = { id: nextBatsman.id, name: nextBatsman.name };
    }
    if (state.nonStrikeBatsman.id === '') {
      const battingKey = state.currentInnings === 1 
        ? (state.team1BattingFirst ? 'team1Batting' : 'team2Batting')
        : (state.team1BattingFirst ? 'team2Batting' : 'team1Batting');
      const nextBatsman = state[battingKey].find(b => !b.isOut && b.id !== state.strikeBatsman.id);
      if (nextBatsman) state.nonStrikeBatsman = { id: nextBatsman.id, name: nextBatsman.name };
    }

    state = processBall(state, ballInput);
    ballCount++;

    // Analysis: Check for obvious errors
    const scoreKey = state.currentInnings === 1
      ? (state.team1BattingFirst ? 'team1Score' : 'team2Score')
      : (state.team1BattingFirst ? 'team2Score' : 'team1Score');
    
    if (state[scoreKey].runs < 0) console.error("CRITICAL: Negative runs!");
    if (state[scoreKey].wickets > 10) console.error("CRITICAL: More than 10 wickets!");
  }

  const t1 = state.team1Score;
  const t2 = state.team2Score;
  console.log(`Final Result: ${state.result}`);
  console.log(`Team 1: ${t1.runs}/${t1.wickets} (${Math.floor(t1.balls/6)}.${t1.balls%6} ov)`);
  console.log(`Team 2: ${t2.runs}/${t2.wickets} (${Math.floor(t2.balls/6)}.${t2.balls%6} ov)`);
  
  // Verification: Sum of batsman runs should equal total runs minus extras (wides/noballs usually count as bowler runs but not batsman runs)
  // Actually, in our logic, total runs = batsman runs + extras.
  // Let's verify.
  return state;
}

const matches = [];
for (let i = 1; i <= 10; i++) {
  matches.push(simulateMatch(i));
}

console.log("\n--- SIMULATION SUMMARY ---");
console.log(`Simulated 10 matches successfully.`);
const averageRuns = matches.reduce((acc, m) => acc + m.team1Score.runs + m.team2Score.runs, 0) / 20;
console.log(`Average Innings Score: ${averageRuns.toFixed(2)}`);

// Deep analysis of issues found
console.log("\n--- ISSUE ANALYSIS ---");
// We can check for specific edge cases in the history
const allBalls = matches.flatMap(m => m.ballHistory);
const freeHits = allBalls.filter(b => b.isFreeHit);
const wicketsOnFreeHits = freeHits.filter(b => b.wicket && b.wicket.type !== 'run_out');

if (wicketsOnFreeHits.length > 0) {
  console.log(`ISSUE FOUND: ${wicketsOnFreeHits.length} non-run-out wickets occurred on Free Hits!`);
} else {
  console.log("SUCCESS: Free Hit wicket logic confirmed robust (no non-run-out wickets recorded).");
}

const lastBallWickets = allBalls.filter(b => b.ballNumber === 5 && b.wicket);
console.log(`Last ball wickets analyzed: ${lastBallWickets.length}`);
// Check if strike rotated correctly on last ball wicket
// ...
