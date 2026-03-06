import { describe, it, expect } from 'vitest';
import { deriveMatchResult } from '../deriveMatchResult';
import type { MatchState } from '../../types/matchStateTypes';

// Helper to create a basic state
const makeState = (firstTotal: number, firstWickets: number, firstBalls: number, firstCompleted: boolean,
    secondTotal: number, secondWickets: number, secondBalls: number, secondCompleted: boolean,
    overs: number = 20): MatchState => ({
        version: 1,
        status: 'LIVE',
        matchPhase: 'REGULAR',
        config: {
            matchId: 'test',
            teamA: { name: 'Team Alpha', players: [] },
            teamB: { name: 'Team Beta', players: [] },
            oversPerInnings: overs,
            initialStrikerId: 'a1',
            initialNonStrikerId: 'a2',
            initialBowlerId: 'b1'
        },
        teams: {
            teamA: { id: 'teamA', name: 'Team Alpha', players: [] },
            teamB: { id: 'teamB', name: 'Team Beta', players: [] }
        },
        totalMatchOvers: overs,
        currentInningsIndex: 1,
        innings: [
            {
                battingTeamId: 'teamA', bowlingTeamId: 'teamB',
                totalRuns: firstTotal, totalWickets: firstWickets, totalBalls: firstBalls, isCompleted: firstCompleted, isFreeHit: false,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
                batters: {}, bowlers: {}, strikerId: null, nonStrikerId: null, currentBowlerId: null
            },
            {
                battingTeamId: 'teamB', bowlingTeamId: 'teamA',
                totalRuns: secondTotal, totalWickets: secondWickets, totalBalls: secondBalls, isCompleted: secondCompleted, isFreeHit: false,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
                batters: {}, bowlers: {}, strikerId: null, nonStrikerId: null, currentBowlerId: null
            }
        ]
    });

describe('deriveMatchResult', () => {

    it('returns undefined if less than 2 innings (match not advanced enough)', () => {
        const s = makeState(10, 0, 10, false, 0, 0, 0, false);
        s.innings = [s.innings[0]]; // Only 1 innings
        expect(deriveMatchResult(s)).toBeUndefined();
    });

    it('Target chased successfully -> WIN (by wickets)', () => {
        // First innings: 100 runs
        // Second innings: 101 runs, 3 wickets down.
        // Target is 101. Chase is 101 >= 101 -> WIN.
        // Wickets remaining = 10 - 3 = 7.
        const s = makeState(100, 10, 120, true, 101, 3, 50, false);
        const res = deriveMatchResult(s);
        expect(res).toBeDefined();
        expect(res?.resultType).toBe('WIN');
        expect(res?.winnerTeamId).toBe('teamB');
        expect(res?.description).toBe('Team Beta won by 7 wickets');
    });

    it('All out below target -> WIN (by runs)', () => {
        // First innings: 100 runs
        // Second innings: 90 runs, 10 wickets down. (All out)
        // Target is 101. 90 < 100. -> Team A wins
        // Runs margin = 100 - 90 = 10.
        const s = makeState(100, 10, 120, true, 90, 10, 95, true);
        const res = deriveMatchResult(s);
        expect(res).toBeDefined();
        expect(res?.resultType).toBe('WIN');
        expect(res?.winnerTeamId).toBe('teamA');
        expect(res?.description).toBe('Team Alpha won by 10 runs');
    });

    it('Overs done below target -> WIN (by runs)', () => {
        // First innings: 100 runs
        // Second innings: 95 runs, 5 wickets down, 120 balls (20 overs done).
        // Target is 101. 95 < 100. -> Team A wins
        // Runs margin = 100 - 95 = 5.
        const s = makeState(100, 10, 120, true, 95, 5, 120, true);
        const res = deriveMatchResult(s);
        expect(res).toBeDefined();
        expect(res?.resultType).toBe('WIN');
        expect(res?.winnerTeamId).toBe('teamA');
        expect(res?.description).toBe('Team Alpha won by 5 runs');
    });

    it('Tie match (runs equal) when innings completes', () => {
        // First innings: 100 runs
        // Second innings: 100 runs, 10 wickets down.
        // Target is 101. 100 == 100. -> TIE
        const s = makeState(100, 10, 120, true, 100, 10, 115, true);
        const res = deriveMatchResult(s);
        expect(res).toBeDefined();
        expect(res?.resultType).toBe('TIE');
        expect(res?.description).toBe('Match tied');
    });

    it('Tie match NOT declared if overs/wickets remain and runs equal', () => {
        // First innings: 100 (target 101)
        // Second innings: 100 runs, 5 wickets, 50 balls.
        // Match is still LIVE because they could score the winning run.
        const s = makeState(100, 10, 120, true, 100, 5, 50, false);
        expect(deriveMatchResult(s)).toBeUndefined();
    });

    it('DLS Target chased -> WIN (DLS)', () => {
        // First innings 100 runs.
        // Interruption sets revised target to 80.
        // Second innings scores 81 runs.
        const s = makeState(100, 10, 120, true, 81, 2, 60, false);
        s.interruption = { isRainActive: true, revisedOvers: 10, revisedTarget: 80 };

        const res = deriveMatchResult(s);
        expect(res).toBeDefined();
        expect(res?.resultType).toBe('WIN');
        expect(res?.description).toBe('Team Beta won by 8 wickets'); // Just checking it recognizes the win
    });

    it('All out below DLS target -> WIN (DLS) label', () => {
        // First innings 100.
        // Revised target 80.
        // Second innings 70 runs, 10 wickets.
        const s = makeState(100, 10, 120, true, 70, 10, 60, true);
        s.interruption = { isRainActive: true, revisedOvers: 10, revisedTarget: 80 };

        const res = deriveMatchResult(s);
        expect(res).toBeDefined();
        expect(res?.resultType).toBe('WIN');
        expect(res?.winnerTeamId).toBe('teamA');
        // Margin = (target - 1) - chase = 79 - 70 = 9 runs.
        expect(res?.description).toBe('Team Alpha won by 9 runs (DLS)');
    });

    it('Super Over checking', () => {
        // Both scored 15. Super over phase.
        const s = makeState(100, 10, 120, true, 100, 10, 120, true);
        s.matchPhase = 'SUPER_OVER';
        s.superOverInnings = [
            {
                battingTeamId: 'teamA', bowlingTeamId: 'teamB',
                totalRuns: 15, totalWickets: 1, totalBalls: 6, isCompleted: true, isFreeHit: false,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
                batters: {}, bowlers: {}, strikerId: null, nonStrikerId: null, currentBowlerId: null
            },
            {
                battingTeamId: 'teamB', bowlingTeamId: 'teamA',
                // Team B scores 16 runs in 5 balls to win it.
                totalRuns: 16, totalWickets: 0, totalBalls: 5, isCompleted: false, isFreeHit: false,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
                batters: {}, bowlers: {}, strikerId: null, nonStrikerId: null, currentBowlerId: null
            }
        ];

        const res = deriveMatchResult(s);
        expect(res).toBeDefined();
        expect(res?.resultType).toBe('WIN');
        expect(res?.winnerTeamId).toBe('teamB');
        // Max wickets in SO is 2. Lost 0. Remaining = 2.
        expect(res?.description).toBe('Team Beta won by 2 wickets (Super Over)');
    });
});
