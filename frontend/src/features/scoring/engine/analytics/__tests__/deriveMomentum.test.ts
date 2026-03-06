import { describe, it, expect } from 'vitest';
import { deriveMomentum } from '../deriveMomentum';
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
    dismissalType: 'CAUGHT',
    runs: 0
} as any);

const makeDot = (): BallEvent => makeRun(0);

describe('deriveMomentum', () => {

    it('calculates UP trend correctly (High scoring recently)', () => {
        // Window = last 6 legal balls
        const events = [
            makeRun(6), makeRun(4), makeRun(1), makeRun(6), makeRun(4), makeRun(2)
        ];

        const momentum = deriveMomentum(events, 0);
        // Weights: 6=5, 4=3, 1=0.5, 6=5, 4=3, 2=1 => Total = 17.5
        expect(momentum.impact).toBe(17.5);
        expect(momentum.trend).toBe('UP');
    });

    it('calculates DOWN trend correctly (Wickets & Dots recently)', () => {
        const events = [
            makeWicket(), makeDot(), makeWicket(), makeDot(), makeDot(), makeDot()
        ];

        const momentum = deriveMomentum(events, 0);
        // Weights: Wicket=-6, Dot=-1
        // Total = -6 - 1 - 6 - 1 - 1 - 1 = -16
        expect(momentum.impact).toBe(-16);
        expect(momentum.trend).toBe('DOWN');
    });

    it('calculates STABLE trend correctly (Consistent singles/doubles)', () => {
        const events = [
            makeRun(1), makeRun(2), makeDot(), makeRun(1), makeRun(1), makeRun(1)
        ];

        const momentum = deriveMomentum(events, 0);
        // Weights: 1=0.5, 2=1, 0=-1
        // Total = 0.5 + 1 - 1 + 0.5 + 0.5 + 0.5 = 2.0
        // > -5 and < 5 => STABLE
        expect(momentum.impact).toBe(2);
        expect(momentum.trend).toBe('STABLE');
    });

    it('scales impact score correctly reflecting momentum shifts', () => {
        const eventsHigh = [makeRun(6), makeRun(6), makeRun(6), makeRun(6), makeRun(6), makeRun(6)]; // 30
        const eventsLow = [makeWicket(), makeWicket(), makeWicket(), makeWicket(), makeWicket(), makeWicket()]; // -36

        expect(deriveMomentum(eventsHigh, 0).impact).toBe(30);
        expect(deriveMomentum(eventsLow, 0).impact).toBe(-36);
    });

});
