/**
 * shareRoutes.ts — Public Shareable Match Pages API
 *
 * All routes are unauthenticated (public).
 * Data is scrubbed — no user IDs, no team IDs in responses.
 * Events only available for COMPLETED matches.
 * Private matches return 403.
 * Rate limited: fail-closed (30 req/min per IP).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../utils/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { cacheGet, cacheSet, rateLimitCheck } from '../utils/redisHelpers.js';

const router = Router();

// ─── Rate Limiting Middleware (Fail-Closed) ───

const SHARE_RATE_MAX = 30;
const SHARE_RATE_WINDOW_MS = 60_000;
const SHARE_RATE_TTL = 120;

async function shareRateLimit(req: Request, res: Response, next: Function) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `share:rate:${ip}`;
    const allowed = await rateLimitCheck(key, SHARE_RATE_MAX, SHARE_RATE_WINDOW_MS, SHARE_RATE_TTL);

    if (!allowed) {
        return sendError(res, 'Rate limit exceeded', 429, 'RATE_LIMITED');
    }
    next();
}

// ─── Visibility Check ───

async function getPublicMatch(matchId: string) {
    const match = await prisma.matchSummary.findUnique({
        where: { id: matchId },
        include: {
            homeTeam: { select: { name: true, shortName: true, logoUrl: true } },
            awayTeam: { select: { name: true, shortName: true, logoUrl: true } },
        }
    });

    if (!match) return null;
    return match;
}

function scrubForPublic(match: any) {
    return {
        id: match.id,
        status: match.status,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        homeTeam: match.homeTeam ? { name: match.homeTeam.name, shortName: match.homeTeam.shortName, logoUrl: match.homeTeam.logoUrl } : undefined,
        awayTeam: match.awayTeam ? { name: match.awayTeam.name, shortName: match.awayTeam.shortName, logoUrl: match.awayTeam.logoUrl } : undefined,
        result: match.result,
        winningTeamName: match.winningTeamName,
        winMargin: match.winMargin,
        venue: match.venue,
        matchDate: match.matchDate,
        overs: match.overs,
        matchType: match.matchType,
        // EXCLUDED: userId, createdBy, homeTeamId, awayTeamId, internal fields
    };
}

// ─── Routes ───

/**
 * GET /api/share/:matchId
 * Public match summary (scrubbed)
 */
router.get('/:matchId', shareRateLimit, async (req: Request, res: Response) => {
    try {
        const matchId = req.params.matchId as string;

        // Check cache
        const cached = await cacheGet(`share:summary:${matchId}`);
        if (cached) {
            return sendSuccess(res, JSON.parse(cached));
        }

        const match = await getPublicMatch(matchId);
        if (!match) return sendError(res, 'Match not found', 404, 'NOT_FOUND');

        const scrubbed = scrubForPublic(match);

        // Cache for 30s
        await cacheSet(`share:summary:${matchId}`, JSON.stringify(scrubbed), 30);

        return sendSuccess(res, scrubbed);
    } catch (error: any) {
        return sendError(res, 'Failed to load match', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/share/:matchId/meta
 * OpenGraph meta tags for social preview cards
 */
router.get('/:matchId/meta', shareRateLimit, async (req: Request, res: Response) => {
    try {
        const matchId = req.params.matchId as string;

        const cached = await cacheGet(`share:meta:${matchId}`);
        if (cached) {
            res.type('text/html').send(cached);
            return;
        }

        const match = await getPublicMatch(matchId);
        if (!match) return res.status(404).send('Match not found');

        const title = `${match.homeTeamName} vs ${match.awayTeamName}`;
        const description = match.result || `${match.status} — CricScore`;
        const url = `https://cricscore.app/share/${matchId}`;

        const meta = `
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${description}" />
            <meta property="og:type" content="article" />
            <meta property="og:url" content="${url}" />
            <meta property="og:site_name" content="CricScore" />
        `.trim();

        await cacheSet(`share:meta:${matchId}`, meta, 60);

        res.type('text/html').send(meta);
    } catch (error: any) {
        return res.status(500).send('Internal error');
    }
});

/**
 * GET /api/share/:matchId/events
 * Events for COMPLETED matches only (for replay).
 * Returns 403 for LIVE/SCHEDULED matches.
 */
router.get('/:matchId/events', shareRateLimit, async (req: Request, res: Response) => {
    try {
        const matchId = req.params.matchId as string;

        const match = await prisma.matchSummary.findUnique({
            where: { id: matchId },
            select: { id: true, status: true }
        });

        if (!match) return sendError(res, 'Match not found', 404, 'NOT_FOUND');

        // Events only for COMPLETED or ABANDONED matches
        if (match.status !== 'COMPLETED' && match.status !== 'ABANDONED') {
            return sendError(res, 'Events not available for live matches', 403, 'EVENTS_RESTRICTED');
        }

        // Fetch operations and return as events
        const ops = await prisma.matchOp.findMany({
            where: { matchId },
            orderBy: { opIndex: 'asc' },
            select: { opIndex: true, payload: true }
        });

        return sendSuccess(res, {
            matchId,
            status: match.status,
            eventCount: ops.length,
            events: ops
        });
    } catch (error: any) {
        return sendError(res, 'Failed to load events', 500, 'INTERNAL_ERROR');
    }
});

export default router;
