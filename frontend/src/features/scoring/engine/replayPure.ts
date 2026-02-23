/**
 * replayPure.ts — Pure Engine Functions for Worker Context
 *
 * SAFETY CONTRACT:
 * ✅ No module-level state
 * ✅ No mutable singletons
 * ✅ No caching / closures
 * ✅ No DOM access
 * ✅ No window reference
 * ✅ No Zustand / store imports
 * ✅ No engineMetrics
 * ✅ Pure: Input → Output
 *
 * This module re-exports ONLY the pure replay/stats functions
 * that are safe to use inside a Web Worker.
 */

// Pure replay functions
export { reconstructMatchState, filterEventsForCurrentPhase } from './replayEngine';

// Pure derived stats functions
export { deriveBatsmanStats } from './derivedStats/deriveBatsmanStats';
export { deriveBowlingStats } from './derivedStats/deriveBowlingStats';
export { deriveFallOfWickets } from './derivedStats/deriveFallOfWickets';

// Types (re-exported for worker convenience)
export type { MatchConfig } from './initialState';
export type { MatchState } from '../types/matchStateTypes';
export type { BallEvent } from '../types/ballEventTypes';
export type { BatsmanStats } from './derivedStats/deriveBatsmanStats';
export type { BowlingStats } from './derivedStats/deriveBowlingStats';
export type { FallOfWicket } from './derivedStats/deriveFallOfWickets';
