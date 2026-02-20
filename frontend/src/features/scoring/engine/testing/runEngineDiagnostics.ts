import {
    generateSimpleInnings,
    generateHatTrickInnings,
    generateChaseScenario,
    generateAllOutScenario,
    generateHighScoringMatch,
    generateTieMatch,
    generateRainAdjustedWin,
    generateRainAdjustedLoss,
    generateRainAdjustedTie,
    generatePowerplayBoundaryTest
} from "./syntheticMatchGenerator";
import { runReplayValidation } from "./engineTestRunner";
import { assertDeepEqual } from "./deterministicAssertions";

import { deriveMilestones } from "../deriveMilestones";
import { deriveCommentary } from "../commentary/deriveCommentary";
import { deriveBatsmanStats } from "../derivedStats/deriveBatsmanStats";
import { deriveBowlingStats } from "../derivedStats/deriveBowlingStats";
import { deriveRunRateProgression, deriveMomentum } from "../analytics";
import type { BallEvent } from "../../../scoring/types/ballEventTypes";

export function runAllDiagnostics(): string[] {
    const logs: string[] = [];
    const log = (msg: string) => {
        logs.push(msg);
        console.log(msg);
    };

    log("==========================================");
    log("🏏 ENGINE DIAGNOSTICS BOOTING...");
    log("==========================================");

    const scenarios = [
        { name: "Simple Innings", events: generateSimpleInnings() },
        { name: "Hat Trick Innings", events: generateHatTrickInnings() },
        { name: "Chase Scenario", events: generateChaseScenario() },
        { name: "All Out Scenario", events: generateAllOutScenario() },
        { name: "High Scoring Match", events: generateHighScoringMatch() },
        { name: "Super Over Tie-Breaker", events: generateTieMatch() },
        { name: "Rain Adjusted Win (DLS-Lite)", events: generateRainAdjustedWin() },
        { name: "Rain Adjusted Loss (DLS-Lite)", events: generateRainAdjustedLoss() },
        { name: "Rain Adjusted Tie -> Super Over (DLS-Lite)", events: generateRainAdjustedTie() },
        { name: "Powerplay Boundary & Ghost Events", events: generatePowerplayBoundaryTest() }
    ];

    let allPassed = true;

    for (const scenario of scenarios) {
        log(`\n▶ Running Scenario: ${scenario.name} (${scenario.events.length} events)`);

        // 1. Replay Validation
        const replayResult = runReplayValidation(scenario.events);
        if (replayResult.success) {
            log("  ✔ Replay deterministic");
        } else {
            log(`  ✘ Replay validation failed: ${replayResult.error}`);
            allPassed = false;
            continue; // Skip derived validation if core replay is broken
        }

        // 2. Derived Engine Verification (Idempotency)
        const isDerivedStable = verifyDerivedEngines(scenario.events);
        if (isDerivedStable) {
            log("  ✔ Derived engines stable");
            log("  ✔ Milestones consistent");
            log("  ✔ Commentary consistent");
        } else {
            log("  ✘ Derived engines unstable (Non-deterministic output detected)");
            allPassed = false;
        }
    }

    log("\n==========================================");
    if (allPassed) {
        log("✅ ALL DIAGNOSTICS PASSED");
    } else {
        log("❌ DIAGNOSTICS FAILED");
    }
    log("==========================================");

    return logs;
}

function verifyDerivedEngines(events: BallEvent[]): boolean {
    // Run everything twice
    const run1 = {
        milestones: deriveMilestones(events),
        commentary: deriveCommentary(events),
        batters: deriveBatsmanStats(events, 0),
        bowlers: deriveBowlingStats(events, 0),
        runRate: deriveRunRateProgression(events, 0, 20),
        momentum: deriveMomentum(events, 0, 20)
    };

    const run2 = {
        milestones: deriveMilestones(events),
        commentary: deriveCommentary(events),
        batters: deriveBatsmanStats(events, 0),
        bowlers: deriveBowlingStats(events, 0),
        runRate: deriveRunRateProgression(events, 0, 20),
        momentum: deriveMomentum(events, 0, 20)
    };

    return assertDeepEqual(run1, run2, "DerivedEngines");
}
