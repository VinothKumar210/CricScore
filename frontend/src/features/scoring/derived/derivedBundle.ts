/**
 * derivedBundle.ts — Layered Lazy Derived Bundle
 *
 * Structural memoization layer that computes all derived state from events.
 * Split into 4 controlled layers:
 *   Layer 1 → Core Replay (always computed)
 *   Layer 2 → Phase Stats (lazy — only when selector accessed)
 *   Layer 3 → Analytics (lazy — only when analytics tab open)
 *   Layer 4 → Broadcast (lazy — only when watcher/panel mounted)
 *
 * Rules:
 *   - No mutations
 *   - No persistent cache outside this scope
 *   - Pure determinism preserved
 *   - Replay-safe, undo-safe, socket-sync-safe
 */

import type { BallEvent } from '../types/ballEventTypes';
import type { MatchState } from '../types/matchStateTypes';
import type { MatchConfig } from '../engine/initialState';
import type { MatchDetail, BallEvent as DomainBallEvent } from '../../matches/types/domainTypes';

// Engine imports
import { reconstructMatchState, filterEventsForCurrentPhase } from '../engine/replayEngine';
import { mapEngineStateToDomain } from '../engine/stateMapper';
import { getMatchChaseInfo } from '../engine/selectors/getMatchChaseInfo';
import type { MatchChaseInfo } from '../engine/selectors/getMatchChaseInfo';

// Derived stats imports
import { derivePartnership } from '../engine/derivedStats/derivePartnership';
import type { PartnershipSummary } from '../engine/derivedStats/derivePartnership';
import { deriveBatsmanStats } from '../engine/derivedStats/deriveBatsmanStats';
import type { BatsmanStats } from '../engine/derivedStats/deriveBatsmanStats';
import { deriveBowlingStats } from '../engine/derivedStats/deriveBowlingStats';
import type { BowlingStats } from '../engine/derivedStats/deriveBowlingStats';
import { deriveFallOfWickets } from '../engine/derivedStats/deriveFallOfWickets';
import type { FallOfWicket } from '../engine/derivedStats/deriveFallOfWickets';

// Analytics imports
import {
    deriveRunRateProgression,
    deriveMomentum,
    derivePressureIndex,
    derivePhaseBreakdown,
    deriveWinProbability
} from '../engine/analytics';
import type { OverRunRatePoint, MomentumState, PressureState, PhaseStats, WinProbability } from '../engine/analytics';

// Broadcast imports
import { deriveMilestones } from '../engine/deriveMilestones';
import type { Milestone } from '../engine/types/milestoneTypes';
import { deriveCommentary } from '../engine/commentary/deriveCommentary';
import type { CommentaryEntry } from '../engine/commentary/commentaryTypes';

// ─── Display Score (computed from domain state) ───
export interface DisplayScoreState {
    totalRuns: number;
    totalWickets: number;
    overs: string;
    crr: string;
}

// ─── Layer Types ───

export interface PhaseLayer {
    partnershipInfo: PartnershipSummary | null;
    batsmanStats: BatsmanStats[];
    bowlingStats: BowlingStats[];
    fallOfWickets: FallOfWicket[];
    phaseStats: PhaseStats[];
}

export interface AnalyticsLayer {
    runRateProgression: OverRunRatePoint[];
    momentum: MomentumState;
    pressureIndex: PressureState | null;
    winProbability: WinProbability | null;
}

export interface BroadcastLayer {
    milestones: Milestone[];
    commentary: CommentaryEntry[];
}

export interface DerivedBundle {
    // Core Layer — always computed
    core: {
        effectiveEvents: BallEvent[];
        derivedState: MatchState;
        domainState: MatchDetail;
        displayScore: DisplayScoreState | null;
        currentOverBalls: DomainBallEvent[];
        lastBall: (DomainBallEvent & { overNumber: number }) | null;
        chaseInfo: MatchChaseInfo | null;
    };

    // Lazy Layers — computed on first access
    getPhase(): PhaseLayer;
    getAnalytics(): AnalyticsLayer;
    getBroadcast(): BroadcastLayer;
}

// ─── Helper: Compute DisplayScore from domain state ───

function computeDisplayScore(domainState: MatchDetail): DisplayScoreState | null {
    const currentInnings = domainState.innings.length > 0
        ? domainState.innings[domainState.innings.length - 1]
        : null;

    if (!currentInnings) return null;

    const runs = currentInnings.totalRuns;
    const wickets = currentInnings.totalWickets;
    const overs = currentInnings.totalOvers;

    const [oversMain, balls] = overs.split('.').map(Number);
    const totalOversDec = oversMain + (balls || 0) / 6;
    const crr = totalOversDec > 0 ? (runs / totalOversDec).toFixed(2) : "0.00";

    return { totalRuns: runs, totalWickets: wickets, overs, crr };
}

// ─── Helper: Compute CurrentOverBalls from domain state ───

function computeCurrentOverBalls(domainState: MatchDetail): DomainBallEvent[] {
    if (!domainState.recentOvers || domainState.recentOvers.length === 0) {
        return [];
    }
    const currentOver = domainState.recentOvers[domainState.recentOvers.length - 1];
    return currentOver.balls || [];
}

// ─── Helper: Compute LastBall from domain state ───

function computeLastBall(domainState: MatchDetail): (DomainBallEvent & { overNumber: number }) | null {
    if (!domainState.recentOvers || domainState.recentOvers.length === 0) {
        return null;
    }
    for (let i = domainState.recentOvers.length - 1; i >= 0; i--) {
        const over = domainState.recentOvers[i];
        if (over.balls && over.balls.length > 0) {
            const lastBall = over.balls[over.balls.length - 1];
            return { ...lastBall, overNumber: over.overNumber };
        }
    }
    return null;
}

// ─── Factory Function ───

export function createDerivedBundle(
    events: BallEvent[],
    matchConfig: MatchConfig,
    matchState: MatchDetail,  // Initial template for domain mapping
    replayIndex: number | null
): DerivedBundle {

    // ═══════════════════════════════════════════
    // Layer 1: Core Replay (ALWAYS COMPUTED ONCE)
    // ═══════════════════════════════════════════

    const effectiveEvents = replayIndex !== null
        ? events.slice(0, replayIndex)
        : events;

    const derivedState = reconstructMatchState(matchConfig, effectiveEvents);
    const domainState = mapEngineStateToDomain(derivedState, matchState, effectiveEvents);

    const displayScore = computeDisplayScore(domainState);
    const currentOverBalls = computeCurrentOverBalls(domainState);
    const lastBall = computeLastBall(domainState);
    const chaseInfo = getMatchChaseInfo(derivedState);

    // ═══════════════════════════════════════════
    // Shared computed values for lazy layers
    // ═══════════════════════════════════════════

    const effectiveOvers = derivedState.interruption?.revisedOvers ?? derivedState.totalMatchOvers ?? 20;
    const isSuperOver = derivedState.matchPhase === "SUPER_OVER";
    const limit = isSuperOver ? 1 : effectiveOvers;

    // ═══════════════════════════════════════════
    // Shared Lazy: Phase Events (computed once, shared by Phase + Analytics)
    // ═══════════════════════════════════════════

    let _phaseEvents: BallEvent[] | null = null;
    function getPhaseEvents(): BallEvent[] {
        if (_phaseEvents) return _phaseEvents;
        _phaseEvents = filterEventsForCurrentPhase(effectiveEvents, derivedState.matchPhase);
        return _phaseEvents;
    }

    // ═══════════════════════════════════════════
    // Layer 2: Phase Stats (LAZY)
    // ═══════════════════════════════════════════

    let phaseCache: PhaseLayer | null = null;

    function getPhase(): PhaseLayer {
        if (phaseCache) return phaseCache;

        const phaseEvents = getPhaseEvents();
        const inningsIdx = derivedState.currentInningsIndex;

        phaseCache = {
            partnershipInfo: derivePartnership(phaseEvents, inningsIdx, limit),
            batsmanStats: deriveBatsmanStats(phaseEvents, inningsIdx),
            bowlingStats: deriveBowlingStats(phaseEvents, inningsIdx),
            fallOfWickets: deriveFallOfWickets(phaseEvents, inningsIdx),
            phaseStats: derivePhaseBreakdown(
                phaseEvents,
                inningsIdx,
                limit,
                derivedState.powerplayConfig,
                isSuperOver
            )
        };

        return phaseCache;
    }

    // ═══════════════════════════════════════════
    // Layer 3: Analytics (LAZY)
    // ═══════════════════════════════════════════

    let analyticsCache: AnalyticsLayer | null = null;

    function getAnalytics(): AnalyticsLayer {
        if (analyticsCache) return analyticsCache;

        const phaseEvents = getPhaseEvents();
        const inningsIdx = derivedState.currentInningsIndex;

        analyticsCache = {
            runRateProgression: deriveRunRateProgression(phaseEvents, inningsIdx, limit),
            momentum: deriveMomentum(phaseEvents, inningsIdx, limit),
            pressureIndex: derivePressureIndex(derivedState),
            winProbability: deriveWinProbability(derivedState)
        };

        return analyticsCache;
    }

    // ═══════════════════════════════════════════
    // Layer 4: Broadcast (LAZY)
    // ═══════════════════════════════════════════

    let broadcastCache: BroadcastLayer | null = null;

    function getBroadcast(): BroadcastLayer {
        if (broadcastCache) return broadcastCache;

        broadcastCache = {
            milestones: deriveMilestones(effectiveEvents),
            commentary: deriveCommentary(effectiveEvents)
        };

        return broadcastCache;
    }

    // ═══════════════════════════════════════════
    // Return Bundle
    // ═══════════════════════════════════════════

    return {
        core: {
            effectiveEvents,
            derivedState,
            domainState,
            displayScore,
            currentOverBalls,
            lastBall,
            chaseInfo
        },
        getPhase,
        getAnalytics,
        getBroadcast
    };
}
