import type { BallEvent } from "../../types/ballEventTypes";

// Internal helper to stamp common fields
function ev(type: "RUN" | "EXTRA" | "WICKET", props: Partial<BallEvent>): BallEvent {
    // We omit overNumber/ballNumber here for simplicity, engine rederives them or expects raw stream
    return {
        matchId: "test-match",
        batsmanId: props.batsmanId || "batter1",
        nonStrikerId: props.nonStrikerId || "batter2",
        bowlerId: props.bowlerId || "bowler1",
        type,
        ...(props as any)
    };
}

export function generateSimpleInnings(): BallEvent[] {
    return [
        ev("RUN", { runs: 0, batsmanId: "b1", nonStrikerId: "b2", bowlerId: "bw1" }),
        ev("RUN", { runs: 1, batsmanId: "b1", nonStrikerId: "b2", bowlerId: "bw1" }),
        ev("RUN", { runs: 2, batsmanId: "b2", nonStrikerId: "b1", bowlerId: "bw1" }),
        ev("RUN", { runs: 4, batsmanId: "b2", nonStrikerId: "b1", bowlerId: "bw1" }),
        ev("EXTRA", { extraType: "WIDE", additionalRuns: 0, batsmanId: "b2", nonStrikerId: "b1", bowlerId: "bw1" }),
        ev("RUN", { runs: 6, batsmanId: "b2", nonStrikerId: "b1", bowlerId: "bw1" }),
        ev("WICKET", { dismissalType: "BOWLED", batsmanId: "b2", nonStrikerId: "b1", bowlerId: "bw1", newBatsmanId: "b3" })
    ];
}

export function generateHatTrickInnings(): BallEvent[] {
    return [
        ev("RUN", { runs: 1, batsmanId: "b1", nonStrikerId: "b2", bowlerId: "bw1" }),
        ev("WICKET", { dismissalType: "CAUGHT", batsmanId: "b2", nonStrikerId: "b1", bowlerId: "bw1", fielderId: "f1", newBatsmanId: "b3" }),
        ev("WICKET", { dismissalType: "LBW", batsmanId: "b3", nonStrikerId: "b1", bowlerId: "bw1", newBatsmanId: "b4" }),
        ev("EXTRA", { extraType: "WIDE", batsmanId: "b4", nonStrikerId: "b1", bowlerId: "bw1", additionalRuns: 0 }),
        ev("WICKET", { dismissalType: "BOWLED", batsmanId: "b4", nonStrikerId: "b1", bowlerId: "bw1", newBatsmanId: "b5" }), // Hat-trick completed across wide
        ev("RUN", { runs: 0, batsmanId: "b5", nonStrikerId: "b1", bowlerId: "bw1" })
    ];
}

export function generateChaseScenario(): BallEvent[] {
    // Assume Innings 1 is 20 runs
    const inn1: BallEvent[] = [];
    for (let i = 0; i < 5; i++) inn1.push(ev("RUN", { runs: 4, batsmanId: "a1", bowlerId: "b1" })); // 20 runs
    inn1.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: "a1", bowlerId: "b1", newBatsmanId: "a2" })); // Total 10 wickets ends inn (simplification, we'll just push 10 to force innings flip if engine requires, or assume single innings for chase test)

    // For a strict 10 wicket innings change test:
    for (let i = 0; i < 9; i++) inn1.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: `a${i + 2}`, bowlerId: "b1", newBatsmanId: `a${i + 3}` }));

    // Innings 2 - chasing 21
    const inn2: BallEvent[] = [];
    inn2.push(ev("RUN", { runs: 6, batsmanId: "c1", bowlerId: "d1" }));
    inn2.push(ev("RUN", { runs: 6, batsmanId: "c1", bowlerId: "d1" }));
    inn2.push(ev("RUN", { runs: 6, batsmanId: "c1", bowlerId: "d1" }));
    inn2.push(ev("RUN", { runs: 4, batsmanId: "c1", bowlerId: "d1" })); // 22 runs cross target

    return [...inn1, ...inn2];
}

export function generateAllOutScenario(): BallEvent[] {
    const events: BallEvent[] = [];
    for (let i = 1; i <= 10; i++) {
        events.push(ev("RUN", { runs: 1, batsmanId: `bat${i}`, bowlerId: "bowl1" }));
        events.push(ev("WICKET", { dismissalType: "CAUGHT", batsmanId: `bat${i}`, bowlerId: "bowl1", newBatsmanId: `bat${i + 1}`, fielderId: "f1" }));
    }
    return events;
}

export function generateHighScoringMatch(): BallEvent[] {
    const events: BallEvent[] = [];
    // Batters hitting 50s, teams hitting 100+
    for (let i = 0; i < 20; i++) {
        events.push(ev("RUN", { runs: 6, batsmanId: "b1", bowlerId: "bw1" })); // 120 runs for b1
    }
    // Change strike
    events.push(ev("RUN", { runs: 1, batsmanId: "b1", nonStrikerId: "b2", bowlerId: "bw1" }));

    for (let i = 0; i < 10; i++) {
        events.push(ev("RUN", { runs: 6, batsmanId: "b2", bowlerId: "bw1" })); // 60 runs for b2
    }
    // Total team = 181
    return events;
}

export function generateTieMatch(): BallEvent[] {
    const events: BallEvent[] = [];

    // Regular Phase Innings 1 (Team A)
    // Scores 5 runs then 10 wickets
    for (let i = 0; i < 5; i++) {
        events.push(ev("RUN", { runs: 1, batsmanId: "a1", bowlerId: "b1" }));
    }
    for (let i = 1; i <= 10; i++) {
        events.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: `a${i}`, bowlerId: "b1", newBatsmanId: `a${i + 1}` }));
    }

    // Regular Phase Innings 2 (Team B)
    // Scores 5 runs then 10 wickets -> TIE
    for (let i = 0; i < 5; i++) {
        events.push(ev("RUN", { runs: 1, batsmanId: "b1", bowlerId: "a1" }));
    }
    for (let i = 1; i <= 10; i++) {
        events.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: `b${i}`, bowlerId: "a1", newBatsmanId: `b${i + 1}` }));
    }

    // Start Super Over
    events.push({ type: "PHASE_CHANGE", newPhase: "SUPER_OVER", matchId: "test-match" } as any);

    // Super Over Innings 1 (Team B) - 1 over limit
    for (let i = 0; i < 6; i++) {
        events.push(ev("RUN", { runs: 2, batsmanId: "b1", bowlerId: "a1" }));
    } // 12 runs total

    // Super Over Innings 2 (Team A) - chases 13
    events.push(ev("RUN", { runs: 6, batsmanId: "a1", bowlerId: "b1" }));
    events.push(ev("RUN", { runs: 6, batsmanId: "a1", bowlerId: "b1" }));
    events.push(ev("RUN", { runs: 6, batsmanId: "a1", bowlerId: "b1" })); // Target reached

    return events;
}

export function generateRainAdjustedWin(): BallEvent[] {
    const events: BallEvent[] = [];
    // Innings 1 (Team A) scores 80 runs then gets all out
    for (let i = 0; i < 20; i++) events.push(ev("RUN", { runs: 4, batsmanId: "a1", bowlerId: "b1" }));
    for (let i = 1; i <= 10; i++) events.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: `a${i}`, bowlerId: "b1", newBatsmanId: `a${i + 1}` }));

    // Rain reduces game to 10 overs. Target = floor((80 / 20) * 10) + 1 = 41.
    events.push({ type: "INTERRUPTION", revisedOvers: 10, matchId: "test-match" } as any);

    // Innings 2 (Team B) - Chases 41
    for (let i = 0; i < 11; i++) events.push(ev("RUN", { runs: 4, batsmanId: "c1", bowlerId: "d1" })); // 44 runs (Wins)

    return events;
}

export function generateRainAdjustedLoss(): BallEvent[] {
    const events: BallEvent[] = [];
    // Innings 1 (Team A) scores 80 runs then gets all out
    for (let i = 0; i < 20; i++) events.push(ev("RUN", { runs: 4, batsmanId: "a1", bowlerId: "b1" }));
    for (let i = 1; i <= 10; i++) events.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: `a${i}`, bowlerId: "b1", newBatsmanId: `a${i + 1}` }));

    // Rain reduces game to 10 overs. Target = 41.
    events.push({ type: "INTERRUPTION", revisedOvers: 10, matchId: "test-match" } as any);

    // Innings 2 (Team B) - Fails to chase, all out for 30
    for (let i = 0; i < 30; i++) events.push(ev("RUN", { runs: 1, batsmanId: "c1", bowlerId: "d1" }));
    for (let i = 1; i <= 10; i++) events.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: `c${i}`, bowlerId: "d1", newBatsmanId: `c${i + 1}` })); // Loss

    return events;
}

export function generateRainAdjustedTie(): BallEvent[] {
    const events: BallEvent[] = [];
    // Innings 1 (Team A) scores 80 runs then gets all out
    for (let i = 0; i < 20; i++) events.push(ev("RUN", { runs: 4, batsmanId: "a1", bowlerId: "b1" }));
    for (let i = 1; i <= 10; i++) events.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: `a${i}`, bowlerId: "b1", newBatsmanId: `a${i + 1}` }));

    // Rain reduces game to 10 overs. Target = 41.
    events.push({ type: "INTERRUPTION", revisedOvers: 10, matchId: "test-match" } as any);

    // Innings 2 (Team B) - Scores exactly 40 runs then all out (Tie)
    for (let i = 0; i < 40; i++) events.push(ev("RUN", { runs: 1, batsmanId: "c1", bowlerId: "d1" }));
    for (let i = 1; i <= 10; i++) events.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: `c${i}`, bowlerId: "d1", newBatsmanId: `c${i + 1}` }));

    // Start Super Over after Tie
    events.push({ type: "PHASE_CHANGE", newPhase: "SUPER_OVER", matchId: "test-match" } as any);

    // Super Over Innings 1 (Team B)
    for (let i = 0; i < 6; i++) events.push(ev("RUN", { runs: 2, batsmanId: "c1", bowlerId: "d1" })); // 12 runs

    // Super Over Innings 2 (Team A) - chases 13
    events.push(ev("RUN", { runs: 6, batsmanId: "a1", bowlerId: "b1" }));
    events.push(ev("RUN", { runs: 6, batsmanId: "a1", bowlerId: "b1" }));
    events.push(ev("RUN", { runs: 6, batsmanId: "a1", bowlerId: "b1" })); // Target reached

    return events;
}

export function generatePowerplayBoundaryTest(): BallEvent[] {
    const events: BallEvent[] = [];

    // Innings 1: 120 legal balls + 5 wides + 5 no-balls (to test that bounds use legal balls)
    for (let i = 0; i < 5; i++) events.push(ev("EXTRA", { extraType: "WIDE", additionalRuns: 0, batsmanId: "a1", bowlerId: "b1", nonStrikerId: "a2" }));
    for (let i = 0; i < 5; i++) events.push(ev("EXTRA", { extraType: "NO_BALL", additionalRuns: 0, runsOffBat: 1, batsmanId: "a1", bowlerId: "b1", nonStrikerId: "a2" }));

    for (let i = 0; i < 120; i++) {
        events.push(ev("RUN", { runs: 1, batsmanId: "a1", bowlerId: "b1", nonStrikerId: "a2" }));
    }

    // At this point, inn1 has exactly 120 legal balls. Innings auto-flips.

    // Innings 2: exactly 120 legal balls
    for (let i = 0; i < 120; i++) {
        events.push(ev("RUN", { runs: 1, batsmanId: "c1", bowlerId: "d1", nonStrikerId: "c2" }));
    }

    // Match is now COMPLETED (20 overs reached).

    // Extra ghost events that should be blocked by the engine's boundary and completion checks
    events.push(ev("RUN", { runs: 6, batsmanId: "c1", bowlerId: "d1", nonStrikerId: "c2" }));
    events.push(ev("WICKET", { dismissalType: "BOWLED", batsmanId: "c1", bowlerId: "d1", newBatsmanId: "c3", nonStrikerId: "c2" }));
    events.push(ev("EXTRA", { extraType: "WIDE", additionalRuns: 0, batsmanId: "c1", bowlerId: "d1", nonStrikerId: "c2" }));

    return events;
}


