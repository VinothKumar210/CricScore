// @ts-nocheck
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.unstable_mockModule('../../utils/stateReconstructor.js', () => ({
    reconstructMatchState: jest.fn()
}));
jest.unstable_mockModule('../../socket/scoringHandlers.js', () => ({
    broadcastScoreUpdate: jest.fn()
}));
jest.unstable_mockModule('../../utils/redisHelpers.js', () => ({
    cacheDel: jest.fn()
}));

const { scoringEngine } = await import('../../services/scoringEngine.js');
const { prisma } = await import('../../utils/db.js');
const { reconstructMatchState } = await import('../../utils/stateReconstructor.js');
const { broadcastScoreUpdate } = await import('../../socket/scoringHandlers.js');
const { cacheDel } = await import('../../utils/redisHelpers.js');

describe('scoringEngine', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => await cb(prisma));
        (prisma.matchSummary as any).findUnique = jest.fn();
        (prisma.matchOp as any).findFirst = jest.fn();
        (prisma.matchOp as any).findMany = jest.fn();
        (prisma.matchOp as any).create = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('addOperation - State Validation', () => {
        it('rejects ops on COMPLETED match', async () => {
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ status: 'COMPLETED' });

            await expect(scoringEngine.addOperation('match_1', 'user_1', {
                clientOpId: 'op_1', expectedVersion: 0, type: 'DELIVER_BALL', payload: {}
            })).rejects.toMatchObject({ code: 'BAD_STATE_TRANSITION', detail: 'MATCH_COMPLETED' });
        });

        it('rejects DELIVER_BALL when innings is complete', async () => {
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ status: 'LIVE' });
            (prisma.matchOp as any).findFirst.mockResolvedValue(null); // No previous operations, version=0
            (prisma.matchOp as any).findMany.mockResolvedValue([]);

            (reconstructMatchState as any).mockReturnValue({
                status: 'LIVE', currentInnings: 1, isInningsComplete: true, totalRuns: 100, wickets: 10
            });

            await expect(scoringEngine.addOperation('match_1', 'user_1', {
                clientOpId: 'op_1', expectedVersion: 0, type: 'DELIVER_BALL', payload: {}
            })).rejects.toMatchObject({ code: 'BAD_STATE_TRANSITION', detail: 'INNINGS_COMPLETE' });
        });

        it('allows valid op on LIVE match', async () => {
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ status: 'LIVE' });
            (prisma.matchOp as any).findFirst.mockResolvedValue(null);
            (prisma.matchOp as any).findMany.mockResolvedValue([]);
            (prisma.matchOp as any).create.mockResolvedValue({ opIndex: 1, type: 'DELIVER_BALL' });

            (reconstructMatchState as any).mockReturnValue({
                status: 'LIVE', currentInnings: 1, isInningsComplete: false, totalRuns: 50, wickets: 2
            });

            const res = await scoringEngine.addOperation('match_1', 'user_1', {
                clientOpId: 'op_1', expectedVersion: 0, type: 'DELIVER_BALL', payload: {}
            });

            expect(res.status).toBe('SUCCESS');
            expect(res.version).toBe(1);
            expect(broadcastScoreUpdate).toHaveBeenCalled();
            expect(cacheDel).toHaveBeenCalled();
        });
    });

    describe('addOperation - Concurrency (OCC)', () => {
        it('throws VERSION_CONFLICT on version mismatch', async () => {
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ status: 'LIVE' });
            // Let the DB report the last operation was version 5, then idempotency check returns null
            (prisma.matchOp as any).findFirst
                .mockResolvedValueOnce({ opIndex: 5 })
                .mockResolvedValueOnce(null);

            await expect(scoringEngine.addOperation('match_1', 'user_1', {
                clientOpId: 'op_1', expectedVersion: 4, type: 'DELIVER_BALL', payload: {}
            })).rejects.toMatchObject({ code: 'VERSION_CONFLICT', currentVersion: 5 });
        });

        it('returns IDEMPOTENT if version mismatches but clientOpId already exists', async () => {
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ status: 'LIVE' });
            (prisma.matchOp as any).findFirst
                .mockResolvedValueOnce({ opIndex: 5 })
                .mockResolvedValueOnce({ opIndex: 3, clientOpId: 'op_dup' });

            const res = await scoringEngine.addOperation('match_1', 'user_1', {
                clientOpId: 'op_dup', expectedVersion: 2, type: 'DELIVER_BALL', payload: {}
            });

            expect(res.status).toBe('IDEMPOTENT');
            expect(res.version).toBe(3);
        });

        it('returns IDEMPOTENT if version matches but clientOpId already exists', async () => {
            (prisma.matchSummary as any).findUnique.mockResolvedValue({ status: 'LIVE' });
            // First check is for currentVersion (finds opIndex 5)
            // Second check is idempotency based on clientOpId (finds the exact same op)
            (prisma.matchOp as any).findFirst
                .mockResolvedValueOnce({ opIndex: 5 })
                .mockResolvedValueOnce({ opIndex: 5, clientOpId: 'op_dup' });

            const res = await scoringEngine.addOperation('match_1', 'user_1', {
                clientOpId: 'op_dup', expectedVersion: 5, type: 'DELIVER_BALL', payload: {}
            });

            expect(res.status).toBe('IDEMPOTENT');
            expect(res.version).toBe(5);
        });
    });

    describe('getMatchState', () => {
        it('returns reconstructed state from operations', async () => {
            (prisma.matchOp as any).findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
            (reconstructMatchState as any).mockReturnValue({ totalRuns: 10 });

            const state = await scoringEngine.getMatchState('match_1');
            expect(state.totalRuns).toBe(10);
            expect(reconstructMatchState).toHaveBeenCalledWith('match_1', [{ id: 1 }, { id: 2 }]);
        });
    });
});
