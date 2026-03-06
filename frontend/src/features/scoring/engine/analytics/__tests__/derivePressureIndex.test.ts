import { describe, it, expect } from 'vitest';
import { derivePressureIndex } from '../derivePressureIndex';
import type { MatchState } from '../../../types/matchStateTypes';

const makeState = (firstRuns: number, firstCompleted: boolean, firstWickets: number, secondRuns: number, secondBalls: number, overs: number = 20): MatchState => ({
    id: '1', version: 1, status: 'LIVE', matchPhase: 'REGULAR',
    config: { matchId: '1', teamA: { id: 'A', name: 'A', players: [] }, teamB: { id: 'B', name: 'B', players: [] }, oversPerInnings: overs, initialStrikerId: 'p1', initialNonStrikerId: 'p2', initialBowlerId: 'b1' },
    teams: { teamA: { id: 'A', name: 'A', players: [] }, teamB: { id: 'B', name: 'B', players: [] } },
    totalMatchOvers: overs,
    currentInningsIndex: 1,
    innings: [
        {
            battingTeamId: 'A', bowlingTeamId: 'B',
            totalRuns: firstRuns, totalWickets: firstWickets, totalBalls: firstCompleted ? overs * 6 : 0, isCompleted: firstCompleted, isFreeHit: false,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
            batters: {}, bowlers: {}, strikerId: null, nonStrikerId: null, currentBowlerId: null
        },
        {
            battingTeamId: 'B', bowlingTeamId: 'A',
            totalRuns: secondRuns, totalWickets: 0, totalBalls: secondBalls, isCompleted: false, isFreeHit: false,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
            batters: {}, bowlers: {}, strikerId: null, nonStrikerId: null, currentBowlerId: null
        }
    ]
});

describe('derivePressureIndex', () => {

    it('returns null if first innings is not completed (not a chase)', () => {
        const state = makeState(100, false, 2, 0, 0); // firstCompleted = false, 2 wickets
        expect(derivePressureIndex(state)).toBeNull();
    });

    it('calculates LOW pressure (CRR well above RRR)', () => {
        // Target 101. 
        // 2nd innings scored 90 runs in 10 overs (60 balls). They need 11 runs in 10 overs.
        // CRR = 90 / 10 = 9.0
        // RRR = 11 / 10 = 1.1
        // RRR - CRR = -7.9 -> LOW
        const state = makeState(100, true, 10, 90, 60);
        const pressure = derivePressureIndex(state);

        expect(pressure?.pressureLevel).toBe('LOW');
        expect(pressure?.currentRate).toBe(9.0);
        expect(pressure?.requiredRate).toBe(1.1);
        expect(pressure?.pressureGap).toBeLessThan(0);
    });

    it('calculates EXTREME pressure (RRR >> CRR)', () => {
        // Target 201.
        // 2nd innings scored 50 runs in 10 overs (60 balls). They need 151 runs in 10 overs.
        // CRR = 50 / 10 = 5.0
        // RRR = 151 / 10 = 15.1
        // RRR - CRR = 10.1 -> EXTREME
        const state = makeState(200, true, 10, 50, 60);
        const pressure = derivePressureIndex(state);

        expect(pressure?.pressureLevel).toBe('EXTREME');
        expect(pressure?.currentRate).toBe(5.0);
        expect(pressure?.requiredRate).toBe(15.1);
        expect(pressure?.pressureGap).toBeGreaterThan(2);
    });

    it('handles zero balls bowled correctly (start of innings)', () => {
        // Target 101. 
        // 0 balls bowled.
        // CRR = 0.
        // RRR = 101 / 20 = 5.05.
        // Gap = 5.05 -> EXTREME (because they need >2 gap over zero).
        const state = makeState(100, true, 10, 0, 0);
        const pressure = derivePressureIndex(state);

        expect(pressure?.currentRate).toBe(0);
        expect(pressure?.requiredRate).toBe(5.05); // 101 / 20
        expect(pressure?.pressureGap).toBe(5.05);
    });
});
