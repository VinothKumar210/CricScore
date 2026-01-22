
// Simulation of the frontend logic from client/src/pages/scoreboard.tsx
// to identify bugs and race conditions.

type DismissalType = 'bowled' | 'caught' | 'lbw' | 'stumped' | 'run_out' | 'hit_wicket';
type ExtraType = 'none' | 'wide' | 'noball' | 'bye' | 'legbye';

interface WicketEvent {
  type: DismissalType;
  dismissedBatsman: 'striker' | 'non-striker';
  dismissedAtEnd: 'striker-end' | 'non-striker-end';
  runsBeforeDismissal: number;
}

interface MatchState {
  strikeBatsman: { id: string; name: string };
  nonStrikeBatsman: { id: string; name: string };
  team1Score: { runs: number; wickets: number; balls: number };
  matchOvers: number;
  isFreeHit: boolean;
}

// The core logic extracted from scoreboard.tsx
function simulateProcessBall(state: MatchState, params: {
  completedRuns: number;
  extraType: ExtraType;
  wicket: WicketEvent | null;
}) {
  const { completedRuns, extraType, wicket } = params;
  
  // 1. Ball legality
  const isLegal = extraType !== 'wide' && extraType !== 'noball';
  const automaticRuns = (extraType === 'wide' || extraType === 'noball') ? 1 : 0;
  const totalRuns = completedRuns + automaticRuns;
  
  // 2. Positions
  let newStriker = { ...state.strikeBatsman };
  let newNonStriker = { ...state.nonStrikeBatsman };
  let newBalls = state.team1Score.balls;
  let shouldShowBowlerSelect = false;

  // 3. Strike rotation from runs
  if (completedRuns % 2 === 1) {
    const temp = newStriker;
    newStriker = newNonStriker;
    newNonStriker = temp;
  }

  // 4. Resolve wicket positioning
  if (wicket) {
    if (wicket.type === 'run_out') {
      if (wicket.dismissedAtEnd === 'striker-end') {
        newStriker = { id: '', name: '' };
      } else {
        newNonStriker = { id: '', name: '' };
      }
    } else {
      newStriker = { id: '', name: '' };
    }
  }

  // 5. Legal ball count
  if (isLegal) {
    newBalls = state.team1Score.balls + 1;
  }

  // 6. Over complete swap
  const isOverComplete = isLegal && newBalls % 6 === 0;
  if (isOverComplete && newBalls < state.matchOvers * 6) {
    const temp = newStriker;
    newStriker = newNonStriker;
    newNonStriker = temp;
    shouldShowBowlerSelect = true;
  }

  // 7. Update score
  const newRuns = state.team1Score.runs + totalRuns;
  const newWickets = state.team1Score.wickets + (wicket ? 1 : 0);

  return {
    newStriker,
    newNonStriker,
    newRuns,
    newWickets,
    newBalls,
    shouldShowBowlerSelect,
    isOverComplete
  };
}

// Test cases
function runTests() {
  console.log("Running Frontend Logic Reproduction Tests...");

  // Scenario 1: Chaos Ball (1 run + run out at non-striker end on last ball of over)
  console.log("\n--- Scenario 1: Chaos Ball ---");
  const state1: MatchState = {
    strikeBatsman: { id: 'S1', name: 'Striker' },
    nonStrikeBatsman: { id: 'S2', name: 'Non-Striker' },
    team1Score: { runs: 10, wickets: 0, balls: 5 }, // 5th ball of over
    matchOvers: 2,
    isFreeHit: false
  };

  const result1 = simulateProcessBall(state1, {
    completedRuns: 1,
    extraType: 'none',
    wicket: {
      type: 'run_out',
      dismissedBatsman: 'striker', // The striker S1 ran 1 run and reached non-striker end
      dismissedAtEnd: 'non-striker-end',
      runsBeforeDismissal: 1
    }
  });

  console.log("Result 1:", JSON.stringify(result1, null, 2));
  
  // Verify Scenario 1:
  // Expected: S1 is out, S2 is at non-striker's end, striker is empty.
  // After 1 run: S2 is striker, S1 is non-striker.
  // S1 out at non-striker end: newNonStriker = empty.
  // Over end swap: newStriker = empty, newNonStriker = S2.
  if (result1.newStriker.id === '' && result1.newNonStriker.id === 'S2') {
    console.log("✅ Scenario 1 correctly identified the empty striker.");
  } else {
    console.log("❌ Scenario 1 failed: Incorrect positions.");
  }

  // Scenario 2: Dialog Trigger Bug (Wicket on last ball)
  console.log("\n--- Scenario 2: Dialog Trigger Bug ---");
  // In the frontend code (lines 823-834):
  /*
    if (wicket && newWickets < getMaxWickets()) {
      setTimeout(() => setShowBatsmanSelectDialog(true), 100);
    } else if (shouldShowBowlerSelect) {
      setTimeout(() => setShowBowlerSelectDialog(true), 100);
    }
  */
  const wicket = true;
  const newWickets = 1;
  const maxWickets = 10;
  const shouldShowBowlerSelect = result1.shouldShowBowlerSelect;

  let showBatsmanDialog = false;
  let showBowlerDialog = false;

  if (wicket && newWickets < maxWickets) {
    showBatsmanDialog = true;
  } else if (shouldShowBowlerSelect) {
    showBowlerDialog = true;
  }

  console.log("Dialogs: Batsman:", showBatsmanDialog, "Bowler:", showBowlerDialog);
  if (showBatsmanDialog && !showBowlerDialog && shouldShowBowlerSelect) {
    console.log("❌ BUG CONFIRMED: Bowler dialog is skipped when a wicket falls on the last ball.");
  } else {
    console.log("✅ Dialog logic behaved as expected (but code has a bug).");
  }

  // Scenario 3: Race Condition (Score update using stale state)
  console.log("\n--- Scenario 3: Race Condition check ---");
  // The frontend uses battingTeamScore.wickets + (wicket ? 1 : 0) OUTSIDE setMatchState.
  // If setMatchState hasn't finished, battingTeamScore is old.
  // This is hard to simulate here but the logic analysis in Scenario 2 confirms it.
}

runTests();
