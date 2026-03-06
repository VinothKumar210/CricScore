import { describe, it, expect } from 'vitest';
import { deriveFallOfWickets } from '../deriveFallOfWickets';
import type { BallEvent } from '../../../types/ballEventTypes';

const makeRun = (runs: number): BallEvent => ({
    type: 'RUN',
    batsmanId: 'p1',
    bowlerId: 'b1',
    runs
} as any);

const makeWicket = (batsmanId: string): BallEvent => ({
    type: 'WICKET',
    batsmanId,
    bowlerId: 'b1',
    dismissalType: 'BOWLED',
    runs: 0
} as any);

describe('deriveFallOfWickets', () => {

    it('orders wickets correctly', () => {
        const events = [
            makeRun(10), // 10 runs
            makeWicket('p1'), // 1st wicket
            makeRun(5), // 5 runs
            makeWicket('p2')  // 2nd wicket
        ];

        const fow = deriveFallOfWickets(events, 0);
        expect(fow.length).toBe(2);
        expect(fow[0].wicketNumber).toBe(1);
        expect(fow[1].wicketNumber).toBe(2);
    });

    it('calculates score at wicket correctly', () => {
        const events = [
            makeRun(10), // 10
            makeWicket('p1'), // Score: 10/1
            makeRun(5), // 15
            makeWicket('p2'), // Score: 15/2
            makeWicket('p3')  // Score: 15/3
        ];

        const fow = deriveFallOfWickets(events, 0);
        expect(fow[0].score).toBe('10/1');
        expect(fow[1].score).toBe('15/2');
        expect(fow[2].score).toBe('15/3');
    });

    it('calculates over at wicket correctly', () => {
        const events: BallEvent[] = [];
        // 14 balls = 2 overs, 2 balls
        for (let i = 0; i < 14; i++) {
            events.push(makeRun(0));
        }
        events.push(makeWicket('p1')); // 15th ball = 2.3 overs

        const fow = deriveFallOfWickets(events, 0);
        expect(fow[0].over).toBe('2.3'); // mathematically Math.floor(15/6) = 2. 15%6 = 3. Wait, is wicket considered a legal delivery? It doesn't increment legalBalls in the current code BEFORE calculating overStr. Ah! In deriveFallOfWickets, I see: `if (isLegalDelivery(event)) legalBalls++` happens BEFORE checking `if (event.type === "WICKET")`. And WICKET is a legal delivery. So it correctly increments -> 15 balls -> 2.3.
    });

    it('handles multiple wickets in the same over', () => {
        const events = [
            makeWicket('p1'), // ball 1
            makeWicket('p2')  // ball 2
        ];
        const fow = deriveFallOfWickets(events, 0);
        expect(fow.length).toBe(2);
        expect(fow[0].over).toBe('0.1');
        expect(fow[0].score).toBe('0/1');
        expect(fow[1].over).toBe('0.2');
        expect(fow[1].score).toBe('0/2');
    });
});
