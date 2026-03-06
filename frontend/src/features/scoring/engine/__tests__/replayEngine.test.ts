import { describe, it, expect } from 'vitest';
import { reconstructMatchState, filterEventsForCurrentPhase } from '../replayEngine';
import type { BallEvent } from '../../types/ballEventTypes';
import type { MatchConfig } from '../initialState';

const config: MatchConfig = {
    matchId: '1',
    teamA: { id: 'teamA', name: 'A', players: ['p1', 'p2'] },
    teamB: { id: 'teamB', name: 'B', players: ['p3'] },
    oversPerInnings: 5,
    initialStrikerId: 'p1',
    initialNonStrikerId: 'p2',
    initialBowlerId: 'p3'
};

const makeEv = (type: string, props: Partial<BallEvent> = {}): BallEvent => ({
    type,
    batsmanId: 'p1',
    nonStrikerId: 'p2',
    bowlerId: 'p3',
    ...props
} as BallEvent);

describe('replayEngine', () => {
    describe('reconstructMatchState', () => {
        it('should reconstruct state deterministically from events', () => {
            const events = [
                makeEv('RUN', { runs: 4 }), // Next player stays on strike
                makeEv('RUN', { runs: 1 }), // Striker swaps to p2
                makeEv('RUN', { runs: 0 }), // Dot ball to p2
            ];

            const state1 = reconstructMatchState(config, events);
            const state2 = reconstructMatchState(config, events);

            // Determinism: identity of the reconstructed state must match
            // totalRuns: 4 + 1 = 5
            expect(state1.innings[0].totalRuns).toBe(5);
            expect(state1.innings[0].totalBalls).toBe(3);
            expect(state1).toEqual(state2); // Deep equality check

            // p2 should be on strike because p1 scored a single
            expect(state1.innings[0].strikerId).toBe('p2');
            expect(state1.innings[0].nonStrikerId).toBe('p1');
        });
    });

    describe('filterEventsForCurrentPhase', () => {
        it('returns all events if no phase change', () => {
            const evs = [makeEv('RUN'), makeEv('WICKET')];
            expect(filterEventsForCurrentPhase(evs)).toEqual(evs);
        });

        it('returns events BEFORE phase change for REGULAR phase', () => {
            const evs = [makeEv('RUN'), makeEv('PHASE_CHANGE'), makeEv('RUN')];
            const filtered = filterEventsForCurrentPhase(evs, 'REGULAR');
            expect(filtered.length).toBe(1); // Only the first RUN
            expect(filtered[0].type).toBe('RUN');
        });

        it('returns events AFTER phase change for SUPER_OVER phase', () => {
            const evs = [makeEv('RUN'), makeEv('PHASE_CHANGE'), makeEv('RUN', { runs: 6 })];
            const filtered = filterEventsForCurrentPhase(evs, 'SUPER_OVER');
            expect(filtered.length).toBe(1); // Only the RUN after PHASE_CHANGE
            expect(filtered[0].runs).toBe(6);
        });

        it('handles multiple phase changes by finding the last one for SUPER_OVER', () => {
            const evs = [
                makeEv('RUN'),
                makeEv('PHASE_CHANGE'),
                makeEv('RUN', { runs: 4 }),
                makeEv('PHASE_CHANGE'), // Say an interruption
                makeEv('RUN', { runs: 6 })
            ];
            const filtered = filterEventsForCurrentPhase(evs, 'SUPER_OVER');
            expect(filtered.length).toBe(1);
            expect(filtered[0].runs).toBe(6);
        });
    });
});
