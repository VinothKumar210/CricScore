import { prisma } from '../utils/db.js';
import { reconstructMatchState } from '../utils/stateReconstructor.js';
import type { MatchOpType } from '../types/scoringTypes.js';

// -----------------------------------------------------------------------------
// State Machine Validation
// Server-authoritative phase enforcement. No client trust.
// -----------------------------------------------------------------------------

interface ValidationResult {
    valid: boolean;
    code?: string;
    message?: string;
}

const validateStateTransition = (
    matchStatus: string,
    currentState: { status: string; currentInnings: number; isInningsComplete: boolean; totalRuns: number; wickets: number },
    opType: MatchOpType,
    payload: any
): ValidationResult => {
    // Rule 1: No ops on completed matches
    if (matchStatus === 'COMPLETED') {
        return { valid: false, code: 'MATCH_COMPLETED', message: 'Cannot score on a completed match' };
    }

    switch (opType) {
        case 'START_INNINGS': {
            const requestedInnings = payload.inningsNumber || 1;

            // Cannot start innings if current innings is active and not complete
            if (currentState.status === 'LIVE' && !currentState.isInningsComplete) {
                return { valid: false, code: 'INNINGS_ACTIVE', message: 'Cannot start new innings while current innings is active' };
            }

            // Cannot skip innings numbers
            if (requestedInnings > 1 && currentState.currentInnings < requestedInnings - 1) {
                return { valid: false, code: 'INNINGS_SKIP', message: `Cannot skip to innings ${requestedInnings}` };
            }

            // Cannot restart same innings (unless state allows it — freshly initialized)
            if (currentState.status === 'LIVE' && currentState.currentInnings === requestedInnings && !currentState.isInningsComplete) {
                return { valid: false, code: 'DUPLICATE_INNINGS', message: `Innings ${requestedInnings} is already active` };
            }

            return { valid: true };
        }

        case 'END_INNINGS': {
            if (currentState.status !== 'LIVE' || currentState.isInningsComplete) {
                return { valid: false, code: 'NO_ACTIVE_INNINGS', message: 'No active innings to end' };
            }
            return { valid: true };
        }

        case 'DELIVER_BALL': {
            if (currentState.status !== 'LIVE') {
                return { valid: false, code: 'NOT_LIVE', message: 'Match is not live — cannot deliver ball' };
            }
            if (currentState.isInningsComplete) {
                return { valid: false, code: 'INNINGS_COMPLETE', message: 'Current innings is complete — cannot deliver ball' };
            }
            return { valid: true };
        }

        case 'WICKET': {
            if (currentState.status !== 'LIVE') {
                return { valid: false, code: 'NOT_LIVE', message: 'Match is not live — cannot record wicket' };
            }
            if (currentState.isInningsComplete) {
                return { valid: false, code: 'INNINGS_COMPLETE', message: 'Current innings is complete' };
            }
            return { valid: true };
        }

        case 'SUPER_OVER': {
            // Super over only valid after tied match (2 completed innings)
            if (currentState.currentInnings < 2 || !currentState.isInningsComplete) {
                return { valid: false, code: 'SUPER_OVER_NOT_ALLOWED', message: 'Super over only allowed after match is tied' };
            }
            return { valid: true };
        }

        case 'UNDO': {
            // Undo is always allowed as long as match is not completed
            return { valid: true };
        }

        case 'RETIRE_BATSMAN':
        case 'SWAP_BATSMAN':
        case 'SWAP_BOWLER': {
            if (currentState.status !== 'LIVE') {
                return { valid: false, code: 'NOT_LIVE', message: 'Match is not live' };
            }
            return { valid: true };
        }

        default:
            return { valid: true };
    }
};

// -----------------------------------------------------------------------------
// Scoring Engine
// Append-only operation log with OCC + server-side state validation.
// -----------------------------------------------------------------------------

export const scoringEngine = {
    /**
     * Add a scoring operation with concurrency control and state machine enforcement.
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
            // 1. Fetch match status
            const match = await tx.matchSummary.findUnique({
                where: { id: matchId },
                select: { status: true },
            });

            if (!match) {
                throw { statusCode: 404, message: 'Match not found', code: 'NOT_FOUND' };
            }

            // 2. Get current version (last opIndex)
            const lastOp = await tx.matchOp.findFirst({
                where: { matchId },
                orderBy: { opIndex: 'desc' },
            });

            const currentVersion = lastOp ? lastOp.opIndex : 0;

            // 3. Concurrency Check
            if (expectedVersion !== currentVersion) {
                // Check for idempotent replay
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

            // 4. Idempotency Check (version matched but maybe duplicate clientOpId)
            const existing = await tx.matchOp.findFirst({
                where: { matchId, clientOpId },
            });
            if (existing) {
                return { status: 'IDEMPOTENT', version: existing.opIndex, op: existing };
            }

            // 5. State Machine Enforcement
            // Reconstruct current state from all ops
            const allOps = await tx.matchOp.findMany({
                where: { matchId },
                orderBy: { opIndex: 'asc' },
            });
            const currentState = reconstructMatchState(matchId, allOps as any[]);

            const validation = validateStateTransition(match.status, currentState, type, payload);
            if (!validation.valid) {
                throw {
                    statusCode: 400,
                    message: validation.message || 'Invalid state transition',
                    code: 'BAD_STATE_TRANSITION',
                    detail: validation.code,
                };
            }

            // 6. Create New Operation
            const newOp = await tx.matchOp.create({
                data: {
                    matchId,
                    clientOpId,
                    opIndex: currentVersion + 1,
                    appliedBy: userId,
                    payload: { ...payload, type },
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
