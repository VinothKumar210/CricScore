import { describe, it, expect } from 'vitest';
import { deriveBowlingStats } from '../deriveBowlingStats';
import type { BallEvent } from '../../../types/ballEventTypes';

const makeRun = (bowlerId: string, runs: number): BallEvent => ({
    type: 'RUN',
    batsmanId: 'p1',
    notStrikerId: 'p2',
    bowlerId,
    runs
} as any);

const makeWicket = (bowlerId: string, type: string = 'BOWLED'): BallEvent => ({
    type: 'WICKET',
    batsmanId: 'p1',
    bowlerId,
    dismissalType: type,
    runs: 0
} as any);

const makeExtra = (bowlerId: string, extraType: string, additionalRuns: number, batRuns: number = 0): BallEvent => ({
    type: 'EXTRA',
    batsmanId: 'p1',
    bowlerId,
    extraType,
    additionalRuns,
    runsOffBat: batRuns
} as any);

describe('deriveBowlingStats', () => {

    it('formats overs correctly (e.g. 26 balls -> "4.2")', () => {
        const events: BallEvent[] = [];
        for (let i = 0; i < 26; i++) {
            events.push(makeRun('b1', 1)); // 26 legal deliveries
        }

        const stats = deriveBowlingStats(events, 0);
        expect(stats[0].overs).toBe('4.2');
        expect(stats[0].runsConceded).toBe(26);
    });

    it('calculates economy rate correctly', () => {
        const events: BallEvent[] = [];
        // 12 balls (2 overs), 18 runs -> Econ 9.00
        for (let i = 0; i < 12; i++) {
            events.push(makeRun('b1', i < 6 ? 2 : 1)); // 12 + 6 = 18 runs
        }

        const stats = deriveBowlingStats(events, 0);
        expect(stats[0].overs).toBe('2.0');
        expect(stats[0].runsConceded).toBe(18);
        expect(stats[0].economy).toBe(9);
    });

    it('credits wickets correctly (excluding run outs)', () => {
        const events = [
            makeWicket('b1', 'BOWLED'),
            makeWicket('b1', 'CAUGHT'),
            makeWicket('b1', 'STUMPED'),
            makeWicket('b1', 'LBW'),
            makeWicket('b1', 'RUN_OUT'), // Should NOT count
        ];

        const stats = deriveBowlingStats(events, 0);
        expect(stats[0].wickets).toBe(4);
    });

    it('identifies maidens correctly (0 runs in 6 legal balls)', () => {
        const events: BallEvent[] = [];

        // Over 1: Maiden
        for (let i = 0; i < 6; i++) {
            events.push(makeRun('b1', 0));
        }

        // Over 2: 1 run
        events.push(makeRun('b1', 1));
        for (let i = 0; i < 5; i++) {
            events.push(makeRun('b1', 0));
        }

        const stats = deriveBowlingStats(events, 0);
        expect(stats[0].maidens).toBe(1);
        expect(stats[0].overs).toBe('2.0');
        expect(stats[0].runsConceded).toBe(1);
    });

    it('handles extras for bowlers correctly', () => {
        const events = [
            makeExtra('b1', 'WIDE', 1),             // 1 run to bowler, 0 legal balls
            makeExtra('b1', 'NO_BALL', 1, 4),       // 1 run (NB) + 4 runs (bat) to bowler, 0 legal balls
            makeExtra('b1', 'LEG_BYE', 1, 0),       // 0 runs to bowler, 1 legal ball
            makeExtra('b1', 'BYE', 4, 0)            // 0 runs to bowler, 1 legal ball
        ];

        const stats = deriveBowlingStats(events, 0);
        expect(stats[0].runsConceded).toBe(6); // 1 (wd) + 1 (nb) + 4 (bat)
        expect(stats[0].overs).toBe('0.2'); // BYE and LEG_BYE are legal deliveries
    });

    it('avoids divide by zero for economy on 0 balls', () => {
        const events = [
            makeExtra('b1', 'WIDE', 5) // 5 runs, 0 legal deliveries
        ];

        const stats = deriveBowlingStats(events, 0);
        expect(stats[0].overs).toBe('0.0');
        expect(stats[0].economy).toBe(0);
    });
});
