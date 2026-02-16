import { prisma } from '../utils/db.js';
import { reconstructMatchState } from '../utils/stateReconstructor.js';
import type { MatchOpType } from '../types/scoringTypes.js';

export const scoringEngine = {
    /**
     * Add a scoring operation with concurrency control.
     */
    addOperation: async (matchId: string, userId: string, operation: {
        clientOpId: string;
        expectedVersion: number;
        type: MatchOpType;
        payload: any;
    }) => {
        const { clientOpId, expectedVersion, type, payload } = operation;

        // Transaction to ensure atomicity
        return prisma.$transaction(async (tx: any) => {
            // 1. Get current version (Count of ops)
            // Ideally lock the rows or use optimistic check.
            // Since we insert with a unique index on (matchId, opIndex) theoretically...
            // Wait, schema has @@index([matchId, opIndex]), not unique.
            // But we have `clientOpId` which we can check.

            // Get the last operation to determine current version
            const lastOp = await tx.matchOp.findFirst({
                where: { matchId },
                orderBy: { opIndex: 'desc' },
            });

            const currentVersion = lastOp ? lastOp.opIndex : 0;

            // 2. Concurrency Check
            if (expectedVersion !== currentVersion) {
                // If mismatch, check if it's a replay of the *same* operation (Idempotency)
                const existing = await tx.matchOp.findFirst({
                    where: { matchId, clientOpId },
                });

                if (existing) {
                    return { status: 'IDEMPOTENT', version: existing.opIndex, op: existing };
                }

                throw {
                    statusCode: 409,
                    message: 'Version Mismatch',
                    code: 'VERSION_CONFLICT',
                    currentVersion,
                    expected: expectedVersion
                };
            }

            // 3. Idempotency Check (if version matched, but maybe duplicate clientOpId?)
            const existing = await tx.matchOp.findFirst({
                where: { matchId, clientOpId },
            });
            if (existing) {
                return { status: 'IDEMPOTENT', version: existing.opIndex, op: existing };
            }

            // 4. Create New Operation
            const newOp = await tx.matchOp.create({
                data: {
                    matchId,
                    clientOpId,
                    opIndex: currentVersion + 1,
                    appliedBy: userId,
                    payload: { ...payload, type }, // Store type inside payload as workaround
                },
            });

            return { status: 'SUCCESS', version: newOp.opIndex, op: newOp };
        });
    },

    /**
     * Get reconstructed state.
     */
    getMatchState: async (matchId: string) => {
        const ops = await prisma.matchOp.findMany({
            where: { matchId },
            orderBy: { opIndex: 'asc' },
        });

        return reconstructMatchState(matchId, ops as any[]);
    },

    /**
     * Get operations list (for syncing).
     */
    getOperations: async (matchId: string, sinceVersion: number = 0) => {
        return prisma.matchOp.findMany({
            where: {
                matchId,
                opIndex: { gt: sinceVersion }
            },
            orderBy: { opIndex: 'asc' },
        });
    }
};
