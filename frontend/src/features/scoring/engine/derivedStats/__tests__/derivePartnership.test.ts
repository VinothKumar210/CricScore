import { describe, it, expect } from 'vitest';
import { derivePartnership } from '../derivePartnership';
import type { BallEvent } from '../../../types/ballEventTypes';

const makeRun = (runs: number): BallEvent => ({
    type: 'RUN',
    batsmanId: 'p1',
    bowlerId: 'b1',
    runs
} as any);

const makeWicket = (): BallEvent => ({
    type: 'WICKET',
    batsmanId: 'p1',
    bowlerId: 'b1',
    dismissalType: 'BOWLED',
    runs: 0
} as any);

describe('derivePartnership', () => {

    it('calculates current partnership runs correctly', () => {
        const events = [
            makeRun(4),
            makeRun(2)
        ];
        const result = derivePartnership(events, 0);
        expect(result.current.runs).toBe(6);
        expect(result.current.balls).toBe(2);
    });

    it('resets current partnership after a wicket', () => {
        const events = [
            makeRun(50), // 50 run partnership
            makeWicket(), // Wicket!
            makeRun(10)  // New 10 run partnership
        ];
        const result = derivePartnership(events, 0);

        expect(result.current.runs).toBe(10);
        expect(result.current.balls).toBe(1); // One legal delivery (makeRun)
    });

    it('tracks the highest partnership correctly', () => {
        const events = [
            makeRun(10), // P1: 10
            makeWicket(),
            makeRun(50), // P2: 50 (highest)
            makeWicket(),
            makeRun(5)   // P3: 5 (current)
        ];
        const result = derivePartnership(events, 0);

        expect(result.current.runs).toBe(5);
        expect(result.highest.runs).toBe(50);
    });

    it('counts opening partnership from ball 1 to first wicket', () => {
        const events = [
            makeRun(1),
            makeRun(4),
            makeWicket() // Ends opening stand of 5 runs off 3 balls
        ];
        const result = derivePartnership(events, 0);

        // Current will reset to 0 runs, 0 balls because wicket fell last
        expect(result.current.runs).toBe(0);
        expect(result.current.balls).toBe(0);
        // Highest should be the opening 5
        expect(result.highest.runs).toBe(5);
        expect(result.highest.balls).toBe(3);
    });

    it('correctly attributes boundaries to partnerships', () => {
        const events = [
            makeRun(4),
            makeRun(6)
        ];
        const result = derivePartnership(events, 0);
        expect(result.current.runs).toBe(10);
        expect(result.current.fours).toBe(1);
        expect(result.current.sixes).toBe(1);
    });
});
