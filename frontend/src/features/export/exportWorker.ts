/**
 * exportWorker.ts — Web Worker for heavy PDF export (>200 events)
 *
 * SAFETY CONTRACT:
 * ✅ Imports ONLY from replayPure.ts (pure functions)
 * ❌ NO engineMetrics (mutable singleton)
 * ❌ NO createDerivedBundle (lazy caching)
 * ❌ NO Zustand / store
 * ❌ NO DOM / window
 * ❌ NO bundle memoization
 *
 * Input → Pure computation → Serializable output
 */

import {
    reconstructMatchState,
    filterEventsForCurrentPhase,
    deriveBatsmanStats,
    deriveBowlingStats,
    deriveFallOfWickets,
} from '../scoring/engine/replayPure';
import type { WorkerInput, WorkerOutput, SerializedScorecard } from './types';

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    try {
        const { events, matchConfig } = e.data;

        // 1. Build engine config
        const engineConfig = {
            matchId: matchConfig.matchId,
            teamA: { id: 'export-a', name: matchConfig.homeTeamName, players: [] },
            teamB: { id: 'export-b', name: matchConfig.awayTeamName, players: [] },
            oversPerInnings: matchConfig.overs,
        };

        // 2. Pure replay reconstruction (no caching, no side effects)
        const matchState = reconstructMatchState(engineConfig, events);

        // 3. Filter events for current phase
        const phaseEvents = filterEventsForCurrentPhase(events, matchState.matchPhase);

        // 4. Derive pure stats (no closures, no memoization)
        const batsmanStats = deriveBatsmanStats(phaseEvents, 0);
        const bowlingStats = deriveBowlingStats(phaseEvents, 0);
        const fallOfWickets = deriveFallOfWickets(phaseEvents, 0);

        // 5. Compute display score
        const totalBalls = phaseEvents.filter(e =>
            e.type !== 'EXTRA' && e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION'
        ).length;
        const completedOvers = Math.floor(totalBalls / 6);
        const remainingBalls = totalBalls % 6;
        const oversStr = `${completedOvers}.${remainingBalls}`;
        const totalOversDec = completedOvers + remainingBalls / 6;

        let totalRuns = 0;
        let totalWickets = 0;
        for (const b of batsmanStats) totalRuns += b.runs;
        for (const b of bowlingStats) totalWickets += b.wickets;

        const crr = totalOversDec > 0 ? (totalRuns / totalOversDec).toFixed(2) : '0.00';

        const scorecard: SerializedScorecard = {
            batsmanStats: batsmanStats.map(b => ({
                playerId: b.playerId,
                runs: b.runs,
                balls: b.balls,
                fours: b.fours,
                sixes: b.sixes,
                strikeRate: b.strikeRate,
                isOut: b.isOut,
            })),
            bowlingStats: bowlingStats.map(b => ({
                bowlerId: b.bowlerId,
                overs: b.overs,
                maidens: b.maidens,
                runsConceded: b.runsConceded,
                wickets: b.wickets,
                economy: b.economy,
            })),
            fallOfWickets: fallOfWickets.map(f => ({
                wicketNumber: f.wicketNumber,
                score: f.score,
                batsmanId: f.batsmanId,
                over: f.over,
            })),
            displayScore: {
                totalRuns,
                totalWickets,
                overs: oversStr,
                crr,
            },
        };

        const output: WorkerOutput = { success: true, data: scorecard };
        self.postMessage(output);
    } catch (err: any) {
        const output: WorkerOutput = { success: false, error: err?.message || 'Worker error' };
        self.postMessage(output);
    }
};
