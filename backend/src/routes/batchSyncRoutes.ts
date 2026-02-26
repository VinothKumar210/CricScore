// =============================================================================
// Batch Sync Route — Accept multiple offline operations at once
// =============================================================================
//
// POST /api/matches/:id/operations/batch
//
// Body: { operations: [{ clientOpId, expectedVersion, type, payload }] }
//
// Returns per-operation results:
//   { results: [{ clientOpId, status: 'ok'|'conflict'|'duplicate'|'error', ... }] }
//
// =============================================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireMatchRole } from '../middlewares/matchPermission.js';
import { scoringEngine } from '../services/scoringEngine.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

interface BatchOpInput {
    clientOpId: string;
    expectedVersion: number;
    type: string;
    payload: Record<string, unknown>;
}

interface BatchOpResult {
    clientOpId: string;
    status: 'ok' | 'conflict' | 'duplicate' | 'error';
    serverVersion?: number;
    error?: string;
}

router.post(
    '/matches/:id/operations/batch',
    requireAuth,
    requireMatchRole(['OWNER', 'CAPTAIN', 'VICE_CAPTAIN']),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const matchId = req.params.id as string;
            const userId = req.user!.id;
            const { operations } = req.body as { operations: BatchOpInput[] };

            if (!Array.isArray(operations) || operations.length === 0) {
                return sendError(res, 'operations array required', 400, 'MISSING_PARAM');
            }

            // Cap at 50 ops per batch
            if (operations.length > 50) {
                return sendError(res, 'Max 50 operations per batch', 400, 'INVALID_INPUT');
            }

            const results: BatchOpResult[] = [];

            // Process sequentially in order (version-dependent)
            for (const op of operations) {
                if (!op.clientOpId || op.expectedVersion === undefined || !op.type) {
                    results.push({
                        clientOpId: op.clientOpId || 'unknown',
                        status: 'error',
                        error: 'Missing required fields',
                    });
                    continue;
                }

                try {
                    const result = await scoringEngine.addOperation(matchId, userId, {
                        clientOpId: op.clientOpId,
                        expectedVersion: op.expectedVersion,
                        type: op.type as any,
                        payload: op.payload,
                    });

                    results.push({
                        clientOpId: op.clientOpId,
                        status: 'ok',
                        serverVersion: (result as any)?.version,
                    });
                } catch (err: any) {
                    if (err.code === 'VERSION_CONFLICT' || err.statusCode === 409) {
                        results.push({
                            clientOpId: op.clientOpId,
                            status: 'conflict',
                            serverVersion: err.currentVersion,
                            error: 'Version conflict',
                        });
                        // Stop processing — subsequent ops depend on this one
                        break;
                    } else if (err.code === 'DUPLICATE_OP') {
                        results.push({
                            clientOpId: op.clientOpId,
                            status: 'duplicate',
                        });
                        // Duplicate is fine — continue
                    } else {
                        results.push({
                            clientOpId: op.clientOpId,
                            status: 'error',
                            error: err.message || 'Unknown error',
                        });
                    }
                }
            }

            return sendSuccess(res, { results, processedCount: results.length });
        } catch (err) {
            next(err);
        }
    },
);

export default router;
