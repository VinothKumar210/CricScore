/**
 * runBundleStressTest.ts — Performance Stress Test for Layered Lazy Bundle
 *
 * Exercises createDerivedBundle directly across 3 scenarios:
 *   Scenario A — Normal Match (50 balls, live mode, read core only)
 *   Scenario B — Analytics Tab Open (20 balls, access analytics layer)
 *   Scenario C — Replay Slider Scrub (100 balls, rapid index changes)
 *
 * Reports: replay duration, hit ratio, layer call counts.
 */

import type { BallEvent } from '../../types/ballEventTypes';
import type { MatchConfig } from '../initialState';
import { createDerivedBundle } from '../../derived/derivedBundle';
import { engineMetrics, resetMetrics } from '../../diagnostics/engineMetrics';
import { reconstructMatchState } from '../replayEngine';
import { mapEngineStateToDomain } from '../stateMapper';
import type { MatchDetail } from '../../../matches/types/domainTypes';

// ─── Dummy Config & State ───

const DUMMY_CONFIG: MatchConfig = {
    matchId: "stress-test",
    teamA: { id: "teamA", name: "Team A", players: [] },
    teamB: { id: "teamB", name: "Team B", players: [] },
    oversPerInnings: 20
} as any;

function makeBall(index: number): BallEvent {
    const r = [0, 1, 1, 2, 4, 6, 0, 1, 0, 1][index % 10];
    return {
        matchId: "stress-test",
        batsmanId: `batter${(index % 3) + 1}`,
        nonStrikerId: `batter${((index + 1) % 3) + 1}`,
        bowlerId: `bowler${(index % 5) + 1}`,
        type: "RUN",
        runs: r,
    } as BallEvent;
}

function makeDummyMatchDetail(events: BallEvent[]): MatchDetail {
    const engineState = reconstructMatchState(DUMMY_CONFIG, events);
    return mapEngineStateToDomain(engineState, {
        id: "stress-test",
        status: "IN_PROGRESS",
        teamA: { id: "teamA", name: "Team A", players: [] },
        teamB: { id: "teamB", name: "Team B", players: [] },
        innings: [],
        scoreA: { runs: 0, wickets: 0, overs: "0.0" },
        scoreB: { runs: 0, wickets: 0, overs: "0.0" },
        recentOvers: []
    } as any, events);
}

// Helper: access value to exercise computation without triggering noUnusedLocals
function consume(..._args: unknown[]): void { /* noop — forces evaluation */ }

// ─── Scenario A: Normal Match (50 balls, live mode) ───

function scenarioA(): string[] {
    const logs: string[] = [];
    resetMetrics();

    const events: BallEvent[] = [];
    for (let i = 0; i < 50; i++) {
        events.push(makeBall(i));
    }

    const matchDetail = makeDummyMatchDetail(events);
    resetMetrics();

    const replayDurations: number[] = [];
    for (let i = 1; i <= 50; i++) {
        const slice = events.slice(0, i);
        const bundle = createDerivedBundle(slice, DUMMY_CONFIG, matchDetail, null);

        // Access Core only (what live mode does)
        consume(bundle.core.displayScore, bundle.core.currentOverBalls, bundle.core.lastBall, bundle.core.chaseInfo);

        // Access Phase (what MatchLiveShell does)
        consume(bundle.getPhase().partnershipInfo, bundle.getPhase().batsmanStats);

        replayDurations.push(engineMetrics.lastReplayDurationMs);
    }

    const avgDuration = replayDurations.reduce((a, b) => a + b, 0) / replayDurations.length;
    const maxDuration = Math.max(...replayDurations);

    logs.push("═════ Scenario A: Normal Match (50 balls, live mode) ═════");
    logs.push(`  Events scored:     50`);
    logs.push(`  Replay avg:        ${avgDuration.toFixed(3)} ms`);
    logs.push(`  Replay max:        ${maxDuration.toFixed(3)} ms`);
    logs.push(`  reconstruct():     ${engineMetrics.reconstructCalls}`);
    logs.push(`  Phase layer calls: ${engineMetrics.phaseLayerCalls}`);
    logs.push(`  Analytics calls:   ${engineMetrics.analyticsLayerCalls} (should be 0 — tab closed)`);
    logs.push(`  Broadcast calls:   ${engineMetrics.broadcastLayerCalls}`);
    logs.push(`  filterPhase():     ${engineMetrics.filterPhaseCalls}`);

    return logs;
}

// ─── Scenario B: Analytics Tab Open (20 balls) ───

function scenarioB(): string[] {
    const logs: string[] = [];
    resetMetrics();

    const events: BallEvent[] = [];
    for (let i = 0; i < 20; i++) {
        events.push(makeBall(i));
    }

    const matchDetail = makeDummyMatchDetail(events);
    resetMetrics();

    const replayDurations: number[] = [];
    for (let i = 1; i <= 20; i++) {
        const slice = events.slice(0, i);
        const bundle = createDerivedBundle(slice, DUMMY_CONFIG, matchDetail, null);

        // Access Core
        consume(bundle.core.displayScore);

        // Access Phase
        consume(bundle.getPhase().batsmanStats);

        // Access Analytics (tab is open!)
        consume(
            bundle.getAnalytics().runRateProgression,
            bundle.getAnalytics().momentum,
            bundle.getAnalytics().pressureIndex,
            bundle.getAnalytics().winProbability
        );

        replayDurations.push(engineMetrics.lastReplayDurationMs);
    }

    const avgDuration = replayDurations.reduce((a, b) => a + b, 0) / replayDurations.length;
    const maxDuration = Math.max(...replayDurations);

    logs.push("═════ Scenario B: Analytics Tab Open (20 balls) ═════");
    logs.push(`  Events scored:     20`);
    logs.push(`  Replay avg:        ${avgDuration.toFixed(3)} ms`);
    logs.push(`  Replay max:        ${maxDuration.toFixed(3)} ms`);
    logs.push(`  reconstruct():     ${engineMetrics.reconstructCalls}`);
    logs.push(`  Phase layer calls: ${engineMetrics.phaseLayerCalls}`);
    logs.push(`  Analytics calls:   ${engineMetrics.analyticsLayerCalls}`);
    logs.push(`  Broadcast calls:   ${engineMetrics.broadcastLayerCalls} (should be 0 — panel closed)`);
    logs.push(`  filterPhase():     ${engineMetrics.filterPhaseCalls}`);

    return logs;
}

// ─── Scenario C: Replay Slider Scrub (100 balls, rapid index changes) ───

function scenarioC(): string[] {
    const logs: string[] = [];
    resetMetrics();

    const events: BallEvent[] = [];
    for (let i = 0; i < 100; i++) {
        events.push(makeBall(i));
    }

    const matchDetail = makeDummyMatchDetail(events);
    resetMetrics();

    const replayDurations: number[] = [];
    const spikes: number[] = [];

    // Forward scrub
    for (let idx = 1; idx <= 100; idx++) {
        const bundle = createDerivedBundle(events, DUMMY_CONFIG, matchDetail, idx);
        consume(bundle.core.displayScore, bundle.core.chaseInfo);
        replayDurations.push(engineMetrics.lastReplayDurationMs);
        if (engineMetrics.lastReplayDurationMs > 10) {
            spikes.push(idx);
        }
    }

    // Backward scrub
    for (let idx = 100; idx >= 1; idx--) {
        const bundle = createDerivedBundle(events, DUMMY_CONFIG, matchDetail, idx);
        consume(bundle.core.displayScore);
        replayDurations.push(engineMetrics.lastReplayDurationMs);
        if (engineMetrics.lastReplayDurationMs > 10) {
            spikes.push(idx);
        }
    }

    const avgDuration = replayDurations.reduce((a, b) => a + b, 0) / replayDurations.length;
    const maxDuration = Math.max(...replayDurations);

    logs.push("═════ Scenario C: Replay Slider Scrub (100 balls, 200 scrubs) ═════");
    logs.push(`  Total events:      100`);
    logs.push(`  Scrub iterations:  200 (fwd 100 + bwd 100)`);
    logs.push(`  Replay avg:        ${avgDuration.toFixed(3)} ms`);
    logs.push(`  Replay max:        ${maxDuration.toFixed(3)} ms`);
    logs.push(`  reconstruct():     ${engineMetrics.reconstructCalls}`);
    logs.push(`  Bundle misses:     ${engineMetrics.bundleMisses} (each scrub = miss)`);
    logs.push(`  Spikes > 10ms:     ${spikes.length > 0 ? spikes.join(', ') : 'NONE'}`);
    logs.push(`  filterPhase():     ${engineMetrics.filterPhaseCalls} (should be 0 — no phase access)`);

    return logs;
}

// ─── Runner ───

export function runBundleStressTest(): string[] {
    const logs: string[] = [];

    logs.push("==========================================");
    logs.push("⚡ BUNDLE STRESS TEST STARTING...");
    logs.push("==========================================");

    logs.push(...scenarioA());
    logs.push("");
    logs.push(...scenarioB());
    logs.push("");
    logs.push(...scenarioC());

    logs.push("");
    logs.push("==========================================");
    logs.push("✅ STRESS TEST COMPLETE");
    logs.push("==========================================");

    logs.forEach(l => console.log(l));

    return logs;
}
