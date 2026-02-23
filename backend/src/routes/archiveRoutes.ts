/**
 * archiveRoutes.ts — Match Archive API
 *
 * GET /api/archive — List user's archived matches (ownership-scoped)
 * GET /api/archive/:id — Full archive with events (ownership-checked)
 * GET /api/archive/:id/export — JSON export with deterministic replay data
 *
 * Archive creation happens inside matchFinalizationService (transactional).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { prisma } from '../utils/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { cacheGet, cacheSet, cacheDel } from '../utils/redisHelpers.js';

const router = Router();

const ENGINE_VERSION = '1.0';

/**
 * GET /api/archive
 * List user's archived matches. Ownership-scoped.
 * Excludes events/matchConfig for performance.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
        const teamId = req.query.teamId as string | undefined;
        const tournament = req.query.tournament as string | undefined;

        // Check cache
        const cacheKey = `archive:list:${userId}:${page}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return sendSuccess(res, JSON.parse(cached));
        }

        // Build where clause — ownership-scoped
        const where: any = { createdById: userId };
        if (teamId) {
            where.OR = [{ homeTeamId: teamId }, { awayTeamId: teamId }];
        }
        if (tournament) {
            where.tournamentName = { contains: tournament, mode: 'insensitive' };
        }

        const [archives, total] = await Promise.all([
            prisma.archivedMatch.findMany({
                where,
                select: {
                    id: true,
                    homeTeamName: true,
                    awayTeamName: true,
                    scoreA: true,
                    scoreB: true,
                    result: true,
                    matchDate: true,
                    overs: true,
                    tournamentName: true,
                    eventCount: true,
                    archivedAt: true,
                    // EXCLUDED: events, matchConfig (performance)
                },
                orderBy: { matchDate: 'desc' },
                take: pageSize,
                skip: (page - 1) * pageSize,
            }),
            prisma.archivedMatch.count({ where })
        ]);

        const result = {
            archives,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };

        await cacheSet(cacheKey, JSON.stringify(result), 300);

        return sendSuccess(res, result);
    } catch (error: any) {
        console.error('[ArchiveRoutes] List Error:', error);
        return sendError(res, 'Failed to load archives', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/archive/:id
 * Full archive with events for replay. Ownership-checked.
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const archiveId = req.params.id as string;

        const archive = await prisma.archivedMatch.findFirst({
            where: {
                id: archiveId,
                createdById: userId  // Ownership enforcement
            }
        });

        if (!archive) {
            return sendError(res, 'Archive not found', 404, 'NOT_FOUND');
        }

        return sendSuccess(res, archive);
    } catch (error: any) {
        console.error('[ArchiveRoutes] Get Error:', error);
        return sendError(res, 'Failed to load archive', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/archive/:id/export
 * JSON export with deterministic replay data.
 * Includes events + matchConfig for portability.
 */
router.get('/:id/export', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const archiveId = req.params.id as string;

        const archive = await prisma.archivedMatch.findFirst({
            where: {
                id: archiveId,
                createdById: userId
            }
        });

        if (!archive) {
            return sendError(res, 'Archive not found', 404, 'NOT_FOUND');
        }

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            match: {
                id: archive.matchSummaryId,
                homeTeamName: archive.homeTeamName,
                awayTeamName: archive.awayTeamName,
                result: archive.result,
                matchDate: archive.matchDate,
                overs: archive.overs,
                tournamentName: archive.tournamentName,
            },
            events: archive.events,
            matchConfig: archive.matchConfig,
            scorecard: {
                scoreA: archive.scoreA,
                scoreB: archive.scoreB,
            },
            meta: {
                eventCount: archive.eventCount,
                engineVersion: archive.engineVersion || ENGINE_VERSION
            }
        };

        return sendSuccess(res, exportData);
    } catch (error: any) {
        console.error('[ArchiveRoutes] Export Error:', error);
        return sendError(res, 'Failed to export archive', 500, 'INTERNAL_ERROR');
    }
});

export default router;
