
import { BallInput, MatchState } from './scoring-logic';

export interface TestScenario {
  name: string;
  initialState: MatchState;
  balls: BallInput[];
  expectedFinalScore: {
    runs: number;
    wickets: number;
    balls: number;
    strikerId: string;
  };
}

const createBaseState = (): MatchState => ({
  currentInnings: 1,
  team1Score: { runs: 0, wickets: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
  team2Score: { runs: 0, wickets: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
  team1Batting: [
    { id: 'b1', name: 'Batsman 1', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false },
    { id: 'b2', name: 'Batsman 2', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false },
    { id: 'b3', name: 'Batsman 3', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false },
  ],
  team2Batting: [],
  team1Bowling: [],
  team2Bowling: [
    { id: 'bw1', name: 'Bowler 1', overs: '0.0', balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 }
  ],
  strikeBatsman: { id: 'b1', name: 'Batsman 1' },
  nonStrikeBatsman: { id: 'b2', name: 'Batsman 2' },
  currentBowler: { id: 'bw1', name: 'Bowler 1' },
  currentOver: [],
  matchOvers: 20,
  team1BattingFirst: true,
  isMatchComplete: false,
  isFreeHit: false,
});

export const scenarios: TestScenario[] = [
  {
    name: "Scenario 1: Simple runs and strike rotation",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 1, extraType: 'none', wicket: null }, // b1 -> 1 run, b2 is now striker
      { completedRuns: 2, extraType: 'none', wicket: null }, // b2 -> 2 runs, b2 remains striker
      { completedRuns: 0, extraType: 'none', wicket: null }, // b2 -> 0 runs
    ],
    expectedFinalScore: { runs: 3, wickets: 0, balls: 3, strikerId: 'b2' }
  },
  {
    name: "Scenario 2: Over completion strike swap",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null }, // End of over 1. Strike should swap.
    ],
    expectedFinalScore: { runs: 0, wickets: 0, balls: 6, strikerId: 'b2' }
  },
  {
    name: "Scenario 3: Wide ball logic (does not count as ball)",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 0, extraType: 'wide', wicket: null }, // 1 run (wide), 0 balls
      { completedRuns: 1, extraType: 'none', wicket: null }, // 1 run, 1 ball
    ],
    expectedFinalScore: { runs: 2, wickets: 0, balls: 1, strikerId: 'b2' }
  },
  {
    name: "Scenario 4: Wicket on last ball of over",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: null },
      { completedRuns: 0, extraType: 'none', wicket: { type: 'bowled', dismissedBatsman: 'striker', dismissedAtEnd: 'striker-end', runsBeforeDismissal: 0 } },
    ],
    expectedFinalScore: { runs: 0, wickets: 1, balls: 6, strikerId: 'b2' } // Striker was b1, b1 out. b2 becomes striker due to over end.
  },
  {
    name: "Scenario 5: No ball and Free Hit",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 0, extraType: 'noball', wicket: null }, // 1 run, 0 balls, Free Hit next
      { completedRuns: 0, extraType: 'none', wicket: { type: 'bowled', dismissedBatsman: 'striker', dismissedAtEnd: 'striker-end', runsBeforeDismissal: 0 } }, // Bowled on free hit! Should NOT be out.
    ],
    expectedFinalScore: { runs: 1, wickets: 0, balls: 1, strikerId: 'b1' }
  },
  {
    name: "Scenario 6: Run out on Free Hit (Allowed)",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 0, extraType: 'noball', wicket: null }, // 1 run, 0 balls, Free Hit next
      { completedRuns: 1, extraType: 'none', wicket: { type: 'run_out', dismissedBatsman: 'striker', dismissedAtEnd: 'non-striker-end', runsBeforeDismissal: 1 } }, 
    ],
    expectedFinalScore: { runs: 2, wickets: 1, balls: 1, strikerId: 'b2' } // b1 run out at non-striker end. b2 is striker.
  },
  {
    name: "Scenario 7: Stumped off a Wide ball",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 0, extraType: 'wide', wicket: { type: 'stumped', dismissedBatsman: 'striker', dismissedAtEnd: 'striker-end', runsBeforeDismissal: 0 } },
    ],
    expectedFinalScore: { runs: 1, wickets: 1, balls: 0, strikerId: '' }
  },
  {
    name: "Scenario 8: Leg-byes (runs to team, not batsman)",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 2, extraType: 'legbye', wicket: null },
    ],
    expectedFinalScore: { runs: 2, wickets: 0, balls: 1, strikerId: 'b1' } // b1 faced ball, but runs are 0 for him. Strike rotated because of 2 runs? Wait, 2 runs means NO rotation.
  },
  {
    name: "Scenario 9: Boundary 4 and 6",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 4, extraType: 'none', wicket: null, isBoundary: true },
      { completedRuns: 6, extraType: 'none', wicket: null, isBoundary: true },
    ],
    expectedFinalScore: { runs: 10, wickets: 0, balls: 2, strikerId: 'b1' }
  },
  {
    name: "Scenario 10: Run out at striker end (New batsman to face)",
    initialState: createBaseState(),
    balls: [
      { completedRuns: 1, extraType: 'none', wicket: { type: 'run_out', dismissedBatsman: 'non-striker', dismissedAtEnd: 'striker-end', runsBeforeDismissal: 1 } },
    ],
    expectedFinalScore: { runs: 1, wickets: 1, balls: 1, strikerId: '' } // b2 run out at striker end after 1 run. Striker is now empty.
  }
];
