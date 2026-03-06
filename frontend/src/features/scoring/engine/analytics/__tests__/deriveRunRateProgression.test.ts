import { describe, it, expect } from 'vitest';
import { deriveRunRateProgression } from '../deriveRunRateProgression';
import type { BallEvent } from '../../../types/ballEventTypes';

const makeRun = (runs: number): BallEvent => ({
    type: 'RUN',
    batsmanId: 'p1',
    bowlerId: 'b1',
    runs
} as any);

describe('deriveRunRateProgression', () => {

    it('calculates per-over runs and cumulative run rate correctly', () => {
        const events: BallEvent[] = [];
        // Over 1: 12 runs
        for (let i = 0; i < 6; i++) {
            events.push(makeRun(2));
        }
        // Over 2: 6 runs
        for (let i = 0; i < 6; i++) {
            events.push(makeRun(1));
        }

        const progression = deriveRunRateProgression(events, 0);

        expect(progression.length).toBe(2);

        expect(progression[0].over).toBe(1);
        expect(progression[0].runs).toBe(12);
        expect(progression[0].cumulativeRuns).toBe(12);
        expect(progression[0].runRate).toBe(12.0); // 12 / 1

        expect(progression[1].over).toBe(2);
        expect(progression[1].runs).toBe(6);
        expect(progression[1].cumulativeRuns).toBe(18);
        expect(progression[1].runRate).toBe(9.0); // 18 / 2
    });

    it('returns empty array for empty innings', () => {
        const progression = deriveRunRateProgression([], 0);
        expect(progression).toEqual([]);
    });

    it('pushes a partial over point if innings ends mid-over', () => {
        const events: BallEvent[] = [];
        // Over 1 (Full): 6 runs
        for (let i = 0; i < 6; i++) {
            events.push(makeRun(1));
        }
        // Over 2 (Partial, 3 balls): 12 runs
        events.push(makeRun(4));
        events.push(makeRun(4));
        events.push(makeRun(4));

        // Let's add wickets to end innings to simulate it stopping.
        // Even without ending, if the array of events just ends mid-over, it should output a partial over.

        const progression = deriveRunRateProgression(events, 0);
        expect(progression.length).toBe(2);

        // 2nd over partial (1.5 overs total)
        expect(progression[1].over).toBe(2);
        expect(progression[1].runs).toBe(12);
        expect(progression[1].cumulativeRuns).toBe(18); // 6 + 12

        // 1.5 overs = 12 runs/over => 18 runs / 1.5 overs
        expect(progression[1].runRate).toBe(12.0);
    });

});
