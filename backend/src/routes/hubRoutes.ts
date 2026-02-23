/**
 * hubRoutes.ts — Live Hub Feed API
 *
 * GET /api/hub/feed — User's matches + public live (authenticated)
 * GET /api/hub/live-count — Global live match count (public)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { prisma } from '../utils/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { cacheGet, cacheSet } from '../utils/redisHelpers.js';

const router = Router();

/**
 * GET /api/hub/feed
 * Returns user's matches (LIVE first) + public live matches + recent completed
 */
router.get('/hub/feed', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        // Check cache first (10s TTL)
        const cached = await cacheGet(`hub:feed:${userId}`);
        if (cached) {
            return sendSuccess(res, JSON.parse(cached));
        }

        // User's matches (as creator or team member)
        const userTeamIds = await prisma.teamMember.findMany({
            where: { userId },
            select: { teamId: true }
        });
        const teamIds = userTeamIds.map(t => t.teamId);

        const yourMatches = await prisma.matchSummary.findMany({
            where: {
                OR: [
                    { homeTeamId: { in: teamIds } },
                    { awayTeamId: { in: teamIds } }
                ]
            },
            orderBy: [
                { status: 'asc' },  // LIVE first (alphabetically before COMPLETED/SCHEDULED)
                { matchDate: 'desc' }
            ],
            take: 20,
            include: {
                homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
            }
        });

        // Public LIVE matches (not involving user)
        const liveMatches = await prisma.matchSummary.findMany({
            where: {
                status: 'LIVE',
                NOT: {
                    OR: [
                        { homeTeamId: { in: teamIds } },
                        { awayTeamId: { in: teamIds } }
                    ]
                }
            },
            orderBy: { matchDate: 'desc' },
            take: 10,
            include: {
                homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
            }
        });

        // Recent completed (user's, last 5)
        const recentCompleted = await prisma.matchSummary.findMany({
            where: {
                status: 'COMPLETED',
                OR: [
                    { homeTeamId: { in: teamIds } },
                    { awayTeamId: { in: teamIds } }
                ]
            },
            orderBy: { matchDate: 'desc' },
            take: 5,
            include: {
                homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
            }
        });

        // Live count
        const liveCount = await prisma.matchSummary.count({
            where: { status: 'LIVE' }
        });

        const feed = {
            yourMatches: yourMatches.map(m => ({
                ...m,
                isUserInvolved: true
            })),
            liveMatches,
            recentCompleted,
            liveCount
        };

        // Cache for 10s
        await cacheSet(`hub:feed:${userId}`, JSON.stringify(feed), 10);

        return sendSuccess(res, feed);
    } catch (error: any) {
        console.error('[HubRoutes] Feed Error:', error);
        return sendError(res, 'Failed to load hub feed', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/hub/live-count
 * Public endpoint — global live match count
 */
router.get('/hub/live-count', async (_req: Request, res: Response) => {
    try {
        const cached = await cacheGet('hub:live-count');
        if (cached) {
            return sendSuccess(res, { liveCount: parseInt(cached) });
        }

        const liveCount = await prisma.matchSummary.count({
            where: { status: 'LIVE' }
        });

        await cacheSet('hub:live-count', String(liveCount), 5);

        return sendSuccess(res, { liveCount });
    } catch (error: any) {
        return sendError(res, 'Failed to get live count', 500, 'INTERNAL_ERROR');
    }
});

export default router;
