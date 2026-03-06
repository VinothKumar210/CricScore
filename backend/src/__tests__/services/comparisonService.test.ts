// @ts-nocheck
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { compareHeadToHead } from '../../services/comparisonService.js';

const { prisma } = await import('../../utils/db.js');

describe('comparisonService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (prisma.user as any).findUnique = jest.fn();
        (prisma.battingPerformance as any).findMany = jest.fn();
        (prisma.bowlingPerformance as any).findMany = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('compareHeadToHead', () => {
        it('throws an error if one or both players are not found', async () => {
            (prisma.user as any).findUnique.mockResolvedValueOnce(null);
            (prisma.user as any).findUnique.mockResolvedValueOnce({ id: 'p2', fullName: 'Player Two' });

            await expect(compareHeadToHead('p1', 'p2')).rejects.toThrow('One or both players not found');
        });

        it('calculates batting aggregations correctly', async () => {
            (prisma.user as any).findUnique.mockResolvedValueOnce({ id: 'p1', fullName: 'Player One' });
            (prisma.user as any).findUnique.mockResolvedValueOnce({ id: 'p2', fullName: 'Player Two' });

            // Player 1 Batting: 2 innings, 1 out, 150 runs, 100 balls
            (prisma.battingPerformance as any).findMany.mockResolvedValueOnce([
                { runs: 100, balls: 60, fours: 10, sixes: 4, strikeRate: 166.67, isOut: true, innings: { matchSummaryId: 'm1' } },
                { runs: 50, balls: 40, fours: 5, sixes: 1, strikeRate: 125, isOut: false, innings: { matchSummaryId: 'm2' } }
            ]);

            // Player 2 Batting: 1 inning, 0 runs, out (duck)
            (prisma.battingPerformance as any).findMany.mockResolvedValueOnce([
                { runs: 0, balls: 5, fours: 0, sixes: 0, strikeRate: 0, isOut: true, innings: { matchSummaryId: 'm1' } }
            ]);

            // Empty bowling for this test
            (prisma.bowlingPerformance as any).findMany.mockResolvedValue([]);

            const result = await compareHeadToHead('p1', 'p2');

            // Player 1 Checks
            expect(result.batting.player1.innings).toBe(2);
            expect(result.batting.player1.runs).toBe(150);
            expect(result.batting.player1.average).toBe(150); // 150 / 1 dismissal
            expect(result.batting.player1.strikeRate).toBe(150); // (150 / 100) * 100
            expect(result.batting.player1.highestScore).toBe(100);
            expect(result.batting.player1.hundreds).toBe(1);
            expect(result.batting.player1.fifties).toBe(1);
            expect(result.batting.player1.notOuts).toBe(1);

            // Player 2 Checks (Duck)
            expect(result.batting.player2.ducks).toBe(1);
            expect(result.batting.player2.runs).toBe(0);
            expect(result.batting.player2.average).toBe(0);
        });

        it('calculates bowling aggregations correctly', async () => {
            (prisma.user as any).findUnique.mockResolvedValueOnce({ id: 'p1', fullName: 'Player One' });
            (prisma.user as any).findUnique.mockResolvedValueOnce({ id: 'p2', fullName: 'Player Two' });

            // Empty batting
            (prisma.battingPerformance as any).findMany.mockResolvedValue([]);

            // Player 1 Bowling: 10 overs, 50 runs, 3 wickets. (Eco: 5, Avg: 16.67)
            (prisma.bowlingPerformance as any).findMany.mockResolvedValueOnce([
                { overs: 4, maidens: 1, runs: 20, wickets: 2, economy: 5, dotBalls: 15, innings: { matchSummaryId: 'm1' } },
                { overs: 6, maidens: 0, runs: 30, wickets: 1, economy: 5, dotBalls: 10, innings: { matchSummaryId: 'm2' } }
            ]);

            // Player 2 Bowling: 4 overs, 40 runs, 5 wickets (5-wkt haul)
            (prisma.bowlingPerformance as any).findMany.mockResolvedValueOnce([
                { overs: 4, maidens: 0, runs: 40, wickets: 5, economy: 10, dotBalls: 5, innings: { matchSummaryId: 'm3' } }
            ]);

            const result = await compareHeadToHead('p1', 'p2');

            // Player 1 Checks
            expect(result.bowling.player1.overs).toBe(10);
            expect(result.bowling.player1.wickets).toBe(3);
            expect(result.bowling.player1.maidens).toBe(1);
            expect(result.bowling.player1.economy).toBe(5);
            expect(result.bowling.player1.average).toBe(16.67);
            expect(result.bowling.player1.bestFigures).toBe('2/20'); // Best is highest wickets, then lowest runs

            // Player 2 Checks
            expect(result.bowling.player2.fiveWickets).toBe(1);
            expect(result.bowling.player2.bestFigures).toBe('5/40');
        });

        it('calculates shared match participation accurately', async () => {
            (prisma.user as any).findUnique.mockResolvedValueOnce({ id: 'p1', fullName: 'P1' });
            (prisma.user as any).findUnique.mockResolvedValueOnce({ id: 'p2', fullName: 'P2' });

            // p1 played in m1, m2, m3
            (prisma.battingPerformance as any).findMany.mockResolvedValueOnce([
                { runs: 10, innings: { matchSummaryId: 'm1' } },
                { runs: 20, innings: { matchSummaryId: 'm2' } }
            ]);
            (prisma.bowlingPerformance as any).findMany.mockResolvedValueOnce([
                { wickets: 1, innings: { matchSummaryId: 'm1' } }, // same match overlapping
                { wickets: 2, innings: { matchSummaryId: 'm3' } }
            ]);

            // p2 played in m2, m3, m4
            (prisma.battingPerformance as any).findMany.mockResolvedValueOnce([
                { runs: 5, innings: { matchSummaryId: 'm2' } },
                { runs: 15, innings: { matchSummaryId: 'm4' } }
            ]);
            (prisma.bowlingPerformance as any).findMany.mockResolvedValueOnce([
                { wickets: 0, innings: { matchSummaryId: 'm3' } }
            ]);

            const result = await compareHeadToHead('p1', 'p2');

            // p1 played m1, m2, m3 => total 3 matches
            expect(result.matches.player1Total).toBe(3);
            // p2 played m2, m3, m4 => total 3 matches
            expect(result.matches.player2Total).toBe(3);
            // shared matches => m2 and m3 (both participated in some form)
            expect(result.matches.sharedMatches).toBe(2);
        });
    });
});
