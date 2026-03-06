// @ts-nocheck
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.unstable_mockModule('../../utils/redisHelpers.js', () => ({
    cacheGet: jest.fn(),
    cacheSet: jest.fn(),
    cacheDel: jest.fn()
}));

const { getWagonWheel, invalidateWagonWheelCache, isValidShotZone, isValidAngle, isValidDistance } = await import('../../services/wagonWheelService.js');
const { prisma } = await import('../../utils/db.js');
const { cacheGet, cacheSet, cacheDel } = await import('../../utils/redisHelpers.js');

describe('wagonWheelService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (prisma.matchSummary as any).findUnique = jest.fn();
        (prisma.user as any).findUnique = jest.fn();
        (prisma.innings as any).findMany = jest.fn();
        (prisma.ballRecord as any).findMany = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Validation & Helpers', () => {
        it('isValidShotZone validates correct zones', () => {
            expect(isValidShotZone('COVER')).toBe(true);
            expect(isValidShotZone('MID_WICKET')).toBe(true);
            expect(isValidShotZone('SOME_WEIRD_ZONE')).toBe(false);
        });

        it('isValidAngle validates 0-360', () => {
            expect(isValidAngle(0)).toBe(true);
            expect(isValidAngle(180)).toBe(true);
            expect(isValidAngle(360)).toBe(true);
            expect(isValidAngle(-1)).toBe(false);
            expect(isValidAngle(361)).toBe(false);
        });

        it('isValidDistance validates 0-1', () => {
            expect(isValidDistance(0)).toBe(true);
            expect(isValidDistance(0.5)).toBe(true);
            expect(isValidDistance(1)).toBe(true);
            expect(isValidDistance(1.1)).toBe(false);
            expect(isValidDistance(-0.1)).toBe(false);
        });
    });

    describe('getWagonWheel - Input Validation', () => {
        it('throws for invalid matchId', async () => {
            await expect(getWagonWheel('short', 'validuserid123'))
                .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PARAM' });
        });

        it('throws for invalid batsmanId', async () => {
            await expect(getWagonWheel('validmatch123', 'short'))
                .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PARAM' });
        });
    });

    describe('getWagonWheel - Caching', () => {
        it('returns cached data if available', async () => {
            const cachedData = { totalRuns: 50 };
            (cacheGet as any).mockResolvedValue(JSON.stringify(cachedData));

            const result = await getWagonWheel('validmatch123', 'validuserid123');
            expect(result).toEqual(cachedData);
            expect(prisma.matchSummary.findUnique).not.toHaveBeenCalled();
        });

        it('invalidates cache correctly', async () => {
            await invalidateWagonWheelCache('match1', 'bat1');
            expect(cacheDel).toHaveBeenCalledWith('ww:match1:bat1');
        });
    });

    describe('getWagonWheel - DB Fetching & Aggregation', () => {
        const matchId = 'validmatch123';
        const batsmanId = 'validuserid123';

        it('throws NOT_FOUND if match does not exist', async () => {
            (cacheGet as any).mockResolvedValue(null);
            (prisma.matchSummary as any).findUnique.mockResolvedValue(null);

            await expect(getWagonWheel(matchId, batsmanId))
                .rejects.toMatchObject({ statusCode: 404, message: 'Match not found' });
        });

        it('throws NOT_FOUND if batsman user does not exist', async () => {
            (cacheGet as any).mockResolvedValue(null);
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ id: matchId });
            (prisma.user as any).findUnique.mockResolvedValue(null);

            await expect(getWagonWheel(matchId, batsmanId))
                .rejects.toMatchObject({ statusCode: 404, message: 'Batsman not found' });
        });

        it('returns null if match has no innings', async () => {
            (cacheGet as any).mockResolvedValue(null);
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ id: matchId });
            (prisma.user as any).findUnique.mockResolvedValue({ fullName: 'John Doe' });
            (prisma.innings as any).findMany.mockResolvedValue([]);

            const result = await getWagonWheel(matchId, batsmanId);
            expect(result).toBeNull();
        });

        it('aggregates ball records correctly', async () => {
            (cacheGet as any).mockResolvedValue(null);
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ id: matchId });
            (prisma.user as any).findUnique.mockResolvedValue({ fullName: 'John Doe' });
            (prisma.innings as any).findMany.mockResolvedValue([{ id: 'in1' }]);

            const mockBalls = [
                { id: 'b1', runs: 4, shotZone: 'COVER', isBoundary: true, isSix: false, overNumber: 1, ballNumber: 1 },
                { id: 'b2', runs: 6, shotZone: 'COVER', isBoundary: false, isSix: true, overNumber: 1, ballNumber: 2 },
                { id: 'b3', runs: 1, shotZone: 'MID_WICKET', isBoundary: false, isSix: false, overNumber: 1, ballNumber: 3 },
            ];

            // First DB call by batsmanId
            (prisma.ballRecord as any).findMany.mockResolvedValue(mockBalls);

            const result = await getWagonWheel(matchId, batsmanId);

            expect(result).toBeDefined();
            expect(result!.totalRuns).toBe(11);
            expect(result!.boundaries).toBe(1);
            expect(result!.sixes).toBe(1);
            expect(result!.totalShots).toBe(3);

            // Verify zone summary
            // Cover: 2 shots, 10 runs (4+6), 2 boundaries
            // Mid Wicket: 1 shot, 1 run, 0 boundaries
            const coverZone = result!.zoneSummary.find(z => z.zone === 'COVER');
            expect(coverZone).toMatchObject({ shotCount: 2, totalRuns: 10, boundaries: 2 });

            const midWicketZone = result!.zoneSummary.find(z => z.zone === 'MID_WICKET');
            expect(midWicketZone).toMatchObject({ shotCount: 1, totalRuns: 1, boundaries: 0 });

            // Verify cache was set
            expect(cacheSet).toHaveBeenCalledWith(`ww:${matchId}:${batsmanId}`, expect.any(String), 300);
        });

        it('falls back to name search if ID search returns no balls', async () => {
            (cacheGet as any).mockResolvedValue(null);
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ id: matchId });
            (prisma.user as any).findUnique.mockResolvedValue({ fullName: 'John Doe' });
            (prisma.innings as any).findMany.mockResolvedValue([{ id: 'in1' }]);

            const mockBalls = [
                { id: 'b1', runs: 2, shotZone: 'POINT', overNumber: 1, ballNumber: 1 }
            ];

            // Returns none for ID
            (prisma.ballRecord as any).findMany
                .mockResolvedValueOnce([])
                // Returns results for name
                .mockResolvedValueOnce(mockBalls);

            const result = await getWagonWheel(matchId, batsmanId);

            expect(prisma.ballRecord.findMany).toHaveBeenCalledTimes(2);
            expect(result!.totalRuns).toBe(2);
            expect(result!.zoneSummary[0].zone).toBe('POINT');
        });
    });
});
