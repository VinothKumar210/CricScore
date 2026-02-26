// =============================================================================
// Wagon Wheel Service — Unit Tests
// =============================================================================

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ---------------------------------------------------------------------------
// Prisma mock (inline — lightweight for single-service tests)
// ---------------------------------------------------------------------------

function createMockModel() {
    return {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
    };
}

const prismaMock: any = {
    matchSummary: createMockModel(),
    user: createMockModel(),
    innings: createMockModel(),
    ballRecord: createMockModel(),
    $transaction: jest.fn((fn: any) => fn(prismaMock)),
};

jest.unstable_mockModule('../../utils/db', () => ({
    prisma: prismaMock,
}));

// Mock Redis helpers (fail-open — always cache miss in tests)
jest.unstable_mockModule('../../utils/redisHelpers', () => ({
    cacheGet: jest.fn().mockResolvedValue(null),
    cacheSet: jest.fn().mockResolvedValue(undefined),
    cacheDel: jest.fn().mockResolvedValue(undefined),
}));

// Dynamic import after mocking
const {
    getWagonWheel,
    isValidShotZone,
    isValidAngle,
    isValidDistance,
    invalidateWagonWheelCache,
} = await import('../../services/wagonWheelService.js');
const { cacheGet, cacheSet, cacheDel } = await import('../../utils/redisHelpers.js');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Wagon Wheel Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ─────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────

    describe('input validation', () => {
        it('should reject empty matchId', async () => {
            await expect(getWagonWheel('', 'valid-batsman-id'))
                .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PARAM' });
        });

        it('should reject empty batsmanId', async () => {
            await expect(getWagonWheel('valid-match-id-x', ''))
                .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PARAM' });
        });

        it('should reject short matchId', async () => {
            await expect(getWagonWheel('abc', 'valid-batsman-id'))
                .rejects.toMatchObject({ statusCode: 400 });
        });
    });

    // ─────────────────────────────────────────────────────────
    // Validation helpers
    // ─────────────────────────────────────────────────────────

    describe('isValidShotZone', () => {
        it('should accept valid zones', () => {
            expect(isValidShotZone('FINE_LEG')).toBe(true);
            expect(isValidShotZone('COVER')).toBe(true);
            expect(isValidShotZone('THIRD_MAN')).toBe(true);
        });

        it('should reject invalid zones', () => {
            expect(isValidShotZone('BEHIND_STUMPS')).toBe(false);
            expect(isValidShotZone('')).toBe(false);
        });
    });

    describe('isValidAngle', () => {
        it('should accept 0–360', () => {
            expect(isValidAngle(0)).toBe(true);
            expect(isValidAngle(180)).toBe(true);
            expect(isValidAngle(360)).toBe(true);
        });

        it('should reject out of range', () => {
            expect(isValidAngle(-1)).toBe(false);
            expect(isValidAngle(361)).toBe(false);
            expect(isValidAngle(NaN)).toBe(false);
        });
    });

    describe('isValidDistance', () => {
        it('should accept 0–1', () => {
            expect(isValidDistance(0)).toBe(true);
            expect(isValidDistance(0.5)).toBe(true);
            expect(isValidDistance(1)).toBe(true);
        });

        it('should reject out of range', () => {
            expect(isValidDistance(-0.1)).toBe(false);
            expect(isValidDistance(1.1)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────
    // Not found
    // ─────────────────────────────────────────────────────────

    describe('match/batsman not found', () => {
        it('should throw 404 if match does not exist', async () => {
            prismaMock.matchSummary.findUnique.mockResolvedValue(null);

            await expect(getWagonWheel('nonexistent-match', 'some-batsman-id'))
                .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
        });

        it('should throw 404 if batsman does not exist', async () => {
            prismaMock.matchSummary.findUnique.mockResolvedValue({ id: 'match1' });
            prismaMock.user.findUnique.mockResolvedValue(null);

            await expect(getWagonWheel('valid-match-id-x', 'nonexistent-user'))
                .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
        });
    });

    // ─────────────────────────────────────────────────────────
    // No data
    // ─────────────────────────────────────────────────────────

    describe('no innings / no balls', () => {
        it('should return null when match has no innings', async () => {
            prismaMock.matchSummary.findUnique.mockResolvedValue({ id: 'match1' });
            prismaMock.user.findUnique.mockResolvedValue({ fullName: 'Virat Kohli' });
            prismaMock.innings.findMany.mockResolvedValue([]);

            const result = await getWagonWheel('valid-match-id-x', 'valid-batsman-id');
            expect(result).toBeNull();
        });

        it('should return null when batsman has no balls', async () => {
            prismaMock.matchSummary.findUnique.mockResolvedValue({ id: 'match1' });
            prismaMock.user.findUnique.mockResolvedValue({ fullName: 'Virat Kohli' });
            prismaMock.innings.findMany.mockResolvedValue([{ id: 'inn1' }]);
            prismaMock.ballRecord.findMany
                .mockResolvedValueOnce([])   // by batsmanId
                .mockResolvedValueOnce([]);  // by batsmanName fallback

            const result = await getWagonWheel('valid-match-id-x', 'valid-batsman-id');
            expect(result).toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────
    // Success case
    // ─────────────────────────────────────────────────────────

    describe('successful wagon wheel', () => {
        const mockBalls = [
            { id: 'b1', overNumber: 1, ballNumber: 1, runs: 4, shotZone: 'COVER', shotAngle: 45, shotDistance: 0.9, isBoundary: true, isSix: false, isWicket: false, bowlerName: 'Bumrah', extraType: null },
            { id: 'b2', overNumber: 1, ballNumber: 2, runs: 6, shotZone: 'LONG_ON', shotAngle: 180, shotDistance: 1.0, isBoundary: false, isSix: true, isWicket: false, bowlerName: 'Bumrah', extraType: null },
            { id: 'b3', overNumber: 1, ballNumber: 3, runs: 1, shotZone: 'COVER', shotAngle: 50, shotDistance: 0.3, isBoundary: false, isSix: false, isWicket: false, bowlerName: 'Bumrah', extraType: null },
            { id: 'b4', overNumber: 2, ballNumber: 1, runs: 0, shotZone: null, shotAngle: null, shotDistance: null, isBoundary: false, isSix: false, isWicket: false, bowlerName: 'Shami', extraType: null },
        ];

        beforeEach(() => {
            prismaMock.matchSummary.findUnique.mockResolvedValue({ id: 'match1' });
            prismaMock.user.findUnique.mockResolvedValue({ fullName: 'Virat Kohli' });
            prismaMock.innings.findMany.mockResolvedValue([{ id: 'inn1' }]);
            prismaMock.ballRecord.findMany.mockResolvedValue(mockBalls);
        });

        it('should return correct aggregated data', async () => {
            const result = await getWagonWheel('valid-match-id-x', 'valid-batsman-id');

            expect(result).not.toBeNull();
            expect(result!.batsmanName).toBe('Virat Kohli');
            expect(result!.totalShots).toBe(4);
            expect(result!.totalRuns).toBe(11); // 4 + 6 + 1 + 0
            expect(result!.boundaries).toBe(1); // boundary but not six
            expect(result!.sixes).toBe(1);
            expect(result!.shots).toHaveLength(4);
        });

        it('should generate zone summary', async () => {
            const result = await getWagonWheel('valid-match-id-x', 'valid-batsman-id');

            // 3 balls have shotZone: 2x COVER, 1x LONG_ON
            // 1 ball has null shotZone — excluded from summary
            expect(result!.zoneSummary).toHaveLength(2);

            const coverZone = result!.zoneSummary.find(z => z.zone === 'COVER');
            expect(coverZone).toBeDefined();
            expect(coverZone!.shotCount).toBe(2);
            expect(coverZone!.totalRuns).toBe(5); // 4 + 1
            expect(coverZone!.boundaries).toBe(1);

            const longOn = result!.zoneSummary.find(z => z.zone === 'LONG_ON');
            expect(longOn!.shotCount).toBe(1);
            expect(longOn!.totalRuns).toBe(6);
        });

        it('should cache the result', async () => {
            await getWagonWheel('valid-match-id-x', 'valid-batsman-id');

            expect(cacheSet).toHaveBeenCalledWith(
                'ww:valid-match-id-x:valid-batsman-id',
                expect.any(String),
                300,
            );
        });

        it('should return cached data on cache hit', async () => {
            const cachedData = JSON.stringify({
                matchId: 'match1', batsmanId: 'bat1', batsmanName: 'Cached Player',
                totalShots: 10, totalRuns: 45, boundaries: 3, sixes: 2,
                shots: [], zoneSummary: [],
            });
            (cacheGet as any).mockResolvedValueOnce(cachedData);

            const result = await getWagonWheel('valid-match-id-x', 'valid-batsman-id');

            expect(result!.batsmanName).toBe('Cached Player');
            // Should NOT hit prisma
            expect(prismaMock.matchSummary.findUnique).not.toHaveBeenCalled();
        });
    });

    // ─────────────────────────────────────────────────────────
    // Cache invalidation
    // ─────────────────────────────────────────────────────────

    describe('invalidateWagonWheelCache', () => {
        it('should delete specific cache key', async () => {
            await invalidateWagonWheelCache('match1', 'bat1');
            expect(cacheDel).toHaveBeenCalledWith('ww:match1:bat1');
        });
    });
});
