import { describe, it, expect } from 'vitest';
import { deriveBatsmanStats } from '../deriveBatsmanStats';
import type { BallEvent } from '../../../types/ballEventTypes';

const makeRun = (batsmanId: string, runs: number): BallEvent => ({
    type: 'RUN',
    batsmanId,
    nonStrikerId: 'p2',
    bowlerId: 'b1',
    runs
} as BallEvent);

const makeWicket = (batsmanId: string, type: string = 'BOWLED'): BallEvent => ({
    type: 'WICKET',
    batsmanId,
    nonStrikerId: 'p2',
    bowlerId: 'b1',
    dismissalType: type,
    runs: 0
} as any);

const makeExtra = (batsmanId: string, extraType: string, extraRuns: number, batRuns: number = 0): BallEvent => ({
    type: 'EXTRA',
    batsmanId,
    nonStrikerId: 'p2',
    bowlerId: 'b1',
    extraType,
    additionalRuns: extraRuns,
    runsOffBat: batRuns
} as any);

describe('deriveBatsmanStats', () => {

    it('calculates basic stats: runs, balls, fours, sixes, strikeRate', () => {
        const events = [
            makeRun('p1', 1),   // 1 run, 1 ball
            makeRun('p1', 4),   // 4 runs, 1 ball
            makeRun('p1', 6),   // 6 runs, 1 ball
            makeRun('p1', 0),   // 0 runs, 1 ball
        ];

        const stats = deriveBatsmanStats(events, 0);
        expect(stats.length).toBe(1);
        expect(stats[0].runs).toBe(11);
        expect(stats[0].balls).toBe(4);
        expect(stats[0].fours).toBe(1);
        expect(stats[0].sixes).toBe(1);
        expect(stats[0].strikeRate).toBe(275); // (11/4) * 100
        expect(stats[0].isOut).toBe(false);
    });

    it('marks batsman as out if WICKET event is recorded', () => {
        const events = [
            makeRun('p1', 1),
            makeWicket('p1', 'CAUGHT')
        ];
        const stats = deriveBatsmanStats(events, 0);
        expect(stats[0].isOut).toBe(true);
        expect(stats[0].runs).toBe(1);
        expect(stats[0].balls).toBe(2);
    });

    it('handles extras correctly for batsman stats', () => {
        const events = [
            makeExtra('p1', 'WIDE', 1, 0),        // Wide: 0 balls to batsman, 0 runs
            makeExtra('p1', 'NO_BALL', 1, 4),     // No Ball + 4 runs off bat: 1 ball, 4 runs, 1 four
            makeExtra('p1', 'LEG_BYE', 1, 0),     // Leg Bye: 1 ball, 0 runs
        ];

        const stats = deriveBatsmanStats(events, 0);
        expect(stats[0].runs).toBe(4);
        expect(stats[0].balls).toBe(2); // NB and LB count as balls faced
        expect(stats[0].fours).toBe(1);
    });

    it('avoids divide by zero for strike rate', () => {
        const events = [
            makeExtra('p1', 'WIDE', 1, 0), // Wides do not increment balls faced
        ];
        const stats = deriveBatsmanStats(events, 0);
        expect(stats[0].balls).toBe(0);
        expect(stats[0].strikeRate).toBe(0);
    });

    it('separates stats by innings correctly', () => {
        const events: BallEvent[] = [];

        // Innings 0: 10 wickets to end innings
        for (let i = 0; i < 10; i++) {
            events.push(makeWicket(`p${i}`, 'BOWLED'));
        }

        // Innings 1
        events.push(makeRun('p11', 4));

        const statsTarget0 = deriveBatsmanStats(events, 0);
        const statsTarget1 = deriveBatsmanStats(events, 1);

        expect(statsTarget0.length).toBe(10);
        expect(statsTarget1.length).toBe(1);
        expect(statsTarget1[0].runs).toBe(4);
    });
});
