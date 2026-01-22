
// Mocking the environment for testing processBall logic from scoreboard.tsx

interface Player {
  id: string;
  name: string;
}

interface BatsmanStats {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType?: string;
  bowler?: string;
  fielder?: string;
}

interface BowlerStats {
  id: string;
  name: string;
  overs: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

interface TeamScore {
  runs: number;
  wickets: number;
  balls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
}

type DismissalType = 'bowled' | 'caught' | 'lbw' | 'stumped' | 'run_out' | 'hit_wicket';
type ExtraType = 'none' | 'wide' | 'noball' | 'bye' | 'legbye';

interface WicketEvent {
  type: DismissalType;
  dismissedBatsman: 'striker' | 'non-striker';
  dismissedAtEnd: 'striker-end' | 'non-striker-end';
  runsBeforeDismissal: number;
  fielder?: string;
}

interface MatchState {
  currentInnings: 1 | 2;
  team1Score: TeamScore;
  team2Score: TeamScore;
  team1Batting: BatsmanStats[];
  team2Batting: BatsmanStats[];
  team1Bowling: BowlerStats[];
  team2Bowling: BowlerStats[];
  strikeBatsman: { id: string; name: string };
  nonStrikeBatsman: { id: string; name: string };
  currentBowler: { id: string; name: string };
  currentOver: string[];
  matchOvers: number;
  team1BattingFirst: boolean;
  isMatchComplete: boolean;
  isFreeHit: boolean;
  ballHistory: any[];
}

const formatOvers = (balls: number): string => {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
};

// Simplified processBall logic from scoreboard.tsx (v1.0 - buggy version)
function simulateProcessBall(state: MatchState, params: {
  completedRuns: number;
  extraType: ExtraType;
  wicket: WicketEvent | null;
  isBoundary?: boolean;
}): MatchState {
  const { completedRuns, extraType, wicket, isBoundary = false } = params;
  
  const isLegal = extraType !== 'wide' && extraType !== 'noball';
  const automaticRuns = (extraType === 'wide' || extraType === 'noball') ? 1 : 0;
  const totalRuns = completedRuns + automaticRuns;
  
  const strikerBefore = { ...state.strikeBatsman };
  const nonStrikerBefore = { ...state.nonStrikeBatsman };
  const battingTeamScore = state.currentInnings === 1 
    ? (state.team1BattingFirst ? state.team1Score : state.team2Score)
    : (state.team1BattingFirst ? state.team2Score : state.team1Score);
  
  let newStriker = { ...state.strikeBatsman };
  let newNonStriker = { ...state.nonStrikeBatsman };
  let newBalls = battingTeamScore.balls;
  
  // Buggy Logic Start (as seen in scoreboard.tsx)
  
  // Step 2 & 3: Strike rotation
  if (completedRuns % 2 === 1) {
    const temp = newStriker;
    newStriker = newNonStriker;
    newNonStriker = temp;
  }
  
  // Step 4: Resolve wicket
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
  
  if (isLegal) {
    newBalls = battingTeamScore.balls + 1;
  }
  
  // Step 6: Over complete
  const isOverComplete = isLegal && newBalls % 6 === 0;
  if (isOverComplete && newBalls < state.matchOvers * 6) {
    const temp = newStriker;
    newStriker = newNonStriker;
    newNonStriker = temp;
  }
  
  // Update score
  const newScore = {
    ...battingTeamScore,
    runs: battingTeamScore.runs + totalRuns,
    balls: newBalls,
    wickets: battingTeamScore.wickets + (wicket ? 1 : 0),
  };

  const newState = { ...state };
  if (state.currentInnings === 1) {
    if (state.team1BattingFirst) newState.team1Score = newScore;
    else newState.team2Score = newScore;
  } else {
    if (state.team1BattingFirst) newState.team2Score = newScore;
    else newState.team1Score = newScore;
  }
  
  newState.strikeBatsman = newStriker;
  newState.nonStrikeBatsman = newNonStriker;
  
  return newState;
}

// TEST SCENARIO: Chaos Ball
// 1 run scored, but striker is run out at non-striker's end on the LAST ball of the over.
const initialState: MatchState = {
  currentInnings: 1,
  team1Score: { runs: 10, wickets: 2, balls: 5, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
  team2Score: { runs: 0, wickets: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
  team1Batting: [], team2Batting: [], team1Bowling: [], team2Bowling: [],
  strikeBatsman: { id: 'B1', name: 'Batsman 1' },
  nonStrikeBatsman: { id: 'B2', name: 'Batsman 2' },
  currentBowler: { id: 'BW1', name: 'Bowler 1' },
  currentOver: ['0', '1', '4', '0', '1'],
  matchOvers: 20,
  team1BattingFirst: true,
  isMatchComplete: false,
  isFreeHit: false,
  ballHistory: []
};

console.log("Initial State: Striker=B1, Non-Striker=B2, Balls=5");

const result = simulateProcessBall(initialState, {
  completedRuns: 1,
  extraType: 'none',
  wicket: {
    type: 'run_out',
    dismissedBatsman: 'striker',
    dismissedAtEnd: 'non-striker-end',
    runsBeforeDismissal: 1
  }
});

console.log("\nChaos Ball Results (1 run, Run out at non-striker end, 6th ball):");
console.log("Total Runs:", result.team1Score.runs, "(Expected: 11)");
console.log("Total Wickets:", result.team1Score.wickets, "(Expected: 3)");
console.log("Total Balls:", result.team1Score.balls, "(Expected: 6)");
console.log("Striker After:", result.strikeBatsman.id, "(Expected: B1 - because B2 moved to striker end due to 1 run, then swapped back due to over end)");
console.log("Non-Striker After:", result.nonStrikeBatsman.id, "(Expected: '' - because B1 was at non-striker end and got out)");

if (result.nonStrikeBatsman.id === '' && result.strikeBatsman.id === 'B1') {
  console.log("\nPASS: Strike rotation correctly identifies that B1 (striker who ran) got out at the non-striker end.");
} else {
  console.log("\nFAIL: Strike rotation incorrect.");
  console.log("Actual Striker:", result.strikeBatsman.id);
  console.log("Actual Non-Striker:", result.nonStrikeBatsman.id);
}
