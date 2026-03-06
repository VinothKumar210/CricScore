// @ts-nocheck
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { matchFinalizationService } from '../../services/matchFinalizationService.js';

// Mock DB
const { prisma } = await import('../../utils/db.js');

// Mock Notification Service
jest.mock('../../services/notificationService.js', () => ({
    notificationService: {
        createNotification: jest.fn().mockResolvedValue(true)
    }
}));

// Mock Tournament Service (Advance bracket)
jest.mock('../../services/tournamentService.js', () => ({
    advanceKnockoutBracket: jest.fn().mockResolvedValue(true)
}));

describe('matchFinalizationService', () => {
    let mockTx: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a fake transaction object with mock Prisma functions
        mockTx = {
            matchSummary: { findUnique: jest.fn(), update: jest.fn() },
            matchOp: { findMany: jest.fn() },
            user: { findMany: jest.fn().mockResolvedValue([]) },
            team: { update: jest.fn() },
            innings: { create: jest.fn().mockResolvedValue({ id: 'in1' }) },
            battingPerformance: { create: jest.fn() },
            bowlingPerformance: { create: jest.fn() },
            ballRecord: { createMany: jest.fn() },
            partnership: { create: jest.fn() },
            matchHighlight: { create: jest.fn() },
            tournamentFixture: { findUnique: jest.fn(), update: jest.fn() },
        };

        // Make prisma.$transaction simply execute the callback with our mockTx
        (prisma.$transaction as any) = jest.fn().mockImplementation(async (cb: any) => {
            return await cb(mockTx);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('finalizeMatch', () => {
        it('throws an error if the match is not found', async () => {
            mockTx.matchSummary.findUnique.mockResolvedValueOnce(null);

            await expect(matchFinalizationService.finalizeMatch('507f191e810c19729de860e0', '507f1f77bcf86cd799439019'))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });

        it('returns early if already finalized', async () => {
            mockTx.matchSummary.findUnique = jest.fn().mockResolvedValueOnce({
                id: '507f191e810c19729de860e0', status: 'COMPLETED', result: 'WIN'
            });

            const result = await matchFinalizationService.finalizeMatch('507f191e810c19729de860e0', '507f1f77bcf86cd799439019');
            expect(result.message).toBe('Match already finalized');
        });

        it('processes a standard match win for Team 2 accurately', async () => {
            mockTx.matchSummary.findUnique.mockResolvedValueOnce({
                id: '507f191e810c19729de860e0',
                status: 'LIVE',
                homeTeamId: '507f191e810c19729de860ea', homeTeamName: 'Team One',
                awayTeamId: '507f191e810c19729de860eb', awayTeamName: 'Team Two',
                tournamentFixtureId: null
            });

            // Mock an ops history that constructs a win for Team 2
            mockTx.matchOp.findMany.mockResolvedValueOnce([
                { payload: { type: 'START_INNINGS', inningsNumber: 1, battingTeamId: '507f191e810c19729de860ea', bowlingTeamId: '507f191e810c19729de860eb', strikerId: '507f1f77bcf86cd799439011' } },
                { payload: { type: 'DELIVER_BALL', runs: 6, batsmanId: '507f1f77bcf86cd799439011', bowlerId: '507f1f77bcf86cd799439013' } }, // Team 1 gets 6 runs
                { payload: { type: 'START_INNINGS', inningsNumber: 2, battingTeamId: '507f191e810c19729de860eb', bowlingTeamId: '507f191e810c19729de860ea', strikerId: '507f1f77bcf86cd799439012' } },
                { payload: { type: 'DELIVER_BALL', runs: 6, batsmanId: '507f1f77bcf86cd799439012', bowlerId: '507f1f77bcf86cd799439014' } },
                { payload: { type: 'DELIVER_BALL', runs: 4, batsmanId: '507f1f77bcf86cd799439012', bowlerId: '507f1f77bcf86cd799439014' } }, // Team 2 gets 10 runs
            ]);

            const result = await matchFinalizationService.finalizeMatch('507f191e810c19729de860e0', '507f1f77bcf86cd799439019');

            expect(result.message).toBe('Match finalized successfully');

            // Verify the update had Team Two winning
            expect(mockTx.matchSummary.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: '507f191e810c19729de860e0' },
                data: expect.objectContaining({
                    status: 'COMPLETED',
                    result: 'WIN',
                    winningTeamName: 'Team Two',
                })
            }));

            // Verify both teams get +1 matchesConfirmed for reliability rating
            expect(mockTx.team.update).toHaveBeenCalledWith({ where: { id: '507f191e810c19729de860ea' }, data: { matchesConfirmed: { increment: 1 } } });
            expect(mockTx.team.update).toHaveBeenCalledWith({ where: { id: '507f191e810c19729de860eb' }, data: { matchesConfirmed: { increment: 1 } } });

            // Verify innings records were created (2 innings)
            expect(mockTx.innings.create).toHaveBeenCalledTimes(2);
        });

        it('processes a TIE accurately when scores match exactly', async () => {
            mockTx.matchSummary.findUnique.mockResolvedValueOnce({
                id: '507f191e810c19729de860e0',
                status: 'LIVE',
                homeTeamId: '507f191e810c19729de860ea', homeTeamName: 'Team One',
                awayTeamId: '507f191e810c19729de860eb', awayTeamName: 'Team Two',
                tournamentFixtureId: null
            });

            // Mock an ops history that constructs a tie (both get 4 runs)
            mockTx.matchOp.findMany.mockResolvedValueOnce([
                { payload: { type: 'START_INNINGS', inningsNumber: 1, battingTeamId: '507f191e810c19729de860ea', bowlingTeamId: '507f191e810c19729de860eb', strikerId: '507f1f77bcf86cd799439011' } },
                { payload: { type: 'DELIVER_BALL', runs: 4, batsmanId: '507f1f77bcf86cd799439011', bowlerId: '507f1f77bcf86cd799439013' } },
                { payload: { type: 'START_INNINGS', inningsNumber: 2, battingTeamId: '507f191e810c19729de860eb', bowlingTeamId: '507f191e810c19729de860ea', strikerId: '507f1f77bcf86cd799439012' } },
                { payload: { type: 'DELIVER_BALL', runs: 4, batsmanId: '507f1f77bcf86cd799439012', bowlerId: '507f1f77bcf86cd799439014' } },
            ]);

            const result = await matchFinalizationService.finalizeMatch('507f191e810c19729de860e0', '507f1f77bcf86cd799439019');

            expect(mockTx.matchSummary.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    status: 'COMPLETED',
                    result: 'TIE',
                    winningTeamName: null,
                    winMargin: 'Tie'
                })
            }));
        });

        it('triggers tournament fixture completion if linked', async () => {
            mockTx.matchSummary.findUnique.mockResolvedValueOnce({
                id: '507f191e810c19729de860e0',
                status: 'LIVE',
                homeTeamId: '507f191e810c19729de860ea', homeTeamName: 'Team One',
                awayTeamId: '507f191e810c19729de860eb', awayTeamName: 'Team Two',
                tournamentFixtureId: '507f1f77bcf86cd799439011'
            });

            mockTx.matchOp.findMany.mockResolvedValueOnce([
                { payload: { type: 'START_INNINGS', inningsNumber: 1, battingTeamId: '507f191e810c19729de860ea', bowlingTeamId: '507f191e810c19729de860eb', strikerId: '507f1f77bcf86cd799439011' } },
                { payload: { type: 'DELIVER_BALL', runs: 6, batsmanId: '507f1f77bcf86cd799439011', bowlerId: '507f1f77bcf86cd799439013' } },
            ]);

            mockTx.tournamentFixture.findUnique.mockResolvedValueOnce({
                id: '507f1f77bcf86cd799439011', tournamentId: '507f1f77bcf86cd799439013', status: 'LIVE',
                tournament: { format: 'LEAGUE' }
            });

            await matchFinalizationService.finalizeMatch('507f191e810c19729de860e0', '507f1f77bcf86cd799439019');

            // Ensures fixture is marked completed with the winner mapped
            expect(mockTx.tournamentFixture.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: '507f1f77bcf86cd799439011' },
                data: expect.objectContaining({ status: 'COMPLETED' })
            }));
        });
    });
});
