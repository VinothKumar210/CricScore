
import { processBall, MatchState } from './scoring-logic';
import { scenarios, TestScenario } from './test-scenarios';

function runScenario(scenario: TestScenario) {
  console.log(`\n--- Running: ${scenario.name} ---`);
  let state = JSON.parse(JSON.stringify(scenario.initialState)) as MatchState;

  for (let i = 0; i < scenario.balls.length; i++) {
    state = processBall(state, scenario.balls[i]);
  }

  const scoreKey = state.currentInnings === 1
    ? (state.team1BattingFirst ? 'team1Score' : 'team2Score')
    : (state.team1BattingFirst ? 'team2Score' : 'team1Score');

  const actualScore = state[scoreKey];
  const actualStrikerId = state.strikeBatsman.id;

  const results = {
    runs: actualScore.runs === scenario.expectedFinalScore.runs,
    wickets: actualScore.wickets === scenario.expectedFinalScore.wickets,
    balls: actualScore.balls === scenario.expectedFinalScore.balls,
    striker: actualStrikerId === scenario.expectedFinalScore.strikerId
  };

  const allPassed = Object.values(results).every(v => v);

  if (allPassed) {
    console.log("✅ PASSED");
  } else {
    console.log("❌ FAILED");
    console.log("Expected:", scenario.expectedFinalScore);
    console.log("Actual:", {
      runs: actualScore.runs,
      wickets: actualScore.wickets,
      balls: actualScore.balls,
      strikerId: actualStrikerId
    });
    
    // Log details of failures
    if (!results.runs) console.log(`  - Runs mismatch: Expected ${scenario.expectedFinalScore.runs}, got ${actualScore.runs}`);
    if (!results.wickets) console.log(`  - Wickets mismatch: Expected ${scenario.expectedFinalScore.wickets}, got ${actualScore.wickets}`);
    if (!results.balls) console.log(`  - Balls mismatch: Expected ${scenario.expectedFinalScore.balls}, got ${actualScore.balls}`);
    if (!results.striker) console.log(`  - Striker mismatch: Expected '${scenario.expectedFinalScore.strikerId}', got '${actualStrikerId}'`);
  }

  return allPassed;
}

const totalScenarios = scenarios.length;
let passedCount = 0;

console.log(`Starting scoring logic tests (${totalScenarios} scenarios)...`);

scenarios.forEach(scenario => {
  if (runScenario(scenario)) {
    passedCount++;
  }
});

console.log(`\n================================`);
console.log(`Test Summary: ${passedCount}/${totalScenarios} passed`);
console.log(`================================`);

if (passedCount < totalScenarios) {
  process.exit(1);
}
