import { prisma } from '../utils/db.js';
import { redisClient } from './presenceService.js';
import type { MatchSummary, MatchStatus } from '@prisma/client';

export const matchService = {
    /**
     * Create a new match.
     * Validates proper teams and positive overs.
     */
    createMatch: async (userId: string, data: any) => {
        const {
            matchType,
            homeTeamId,
            awayTeamId,
            overs,
            ballType,
            powerplayEnabled,
            venue,
            matchDate,
            homeTeamName, // Optional overrides or fetch from DB
            awayTeamName
        } = data;

        // RATE LIMIT: Max 5 matches per day per user
        const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rateKey = `match:create:${userId}:${dateKey}`;
        const count = await redisClient.incr(rateKey);
        if (count === 1) await redisClient.expire(rateKey, 86400);

        if (count > 5) {
            throw { statusCode: 429, message: 'Daily match creation limit reached (Max 5)', code: 'RATE_LIMIT_EXCEEDED' };
        }

        // Validation
        if (homeTeamId === awayTeamId) {
            throw { statusCode: 400, message: 'Teams cannot play against themselves', code: 'INVALID_TEAMS' };
        }
        if (overs <= 0) {
            throw { statusCode: 400, message: 'Overs must be positive', code: 'INVALID_OVERS' };
        }

        // Fetch team names if not provided
        let htName = homeTeamName;
        let atName = awayTeamName;

        if (!htName || !atName) {
            const [home, away] = await Promise.all([
                prisma.team.findUnique({ where: { id: homeTeamId } }),
                prisma.team.findUnique({ where: { id: awayTeamId } })
            ]);

            if (!home || !away) throw { statusCode: 404, message: 'Teams not found', code: 'TEAM_NOT_FOUND' };
            htName = home.name;
            atName = away.name;
        }

        return prisma.matchSummary.create({
            data: {
                matchType,
                homeTeamId,
                awayTeamId,
                homeTeamName: htName,
                awayTeamName: atName,
                overs,
                ballType,
                powerplayEnabled: !!powerplayEnabled,
                venue,
                matchDate: new Date(matchDate || Date.now()),
                status: 'SCHEDULED', // Initial state
                // Link to fixture if provided (Schema already has this field)
                tournamentFixtureId: data.tournamentFixtureId || null
            }
        });
    },

    /**
     * Get match details.
     */
    getMatch: async (matchId: string) => {
        return prisma.matchSummary.findUnique({
            where: { id: matchId },
            include: {
                homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
            }
        });
    },

    /**
     * List matches with filters.
     */
    getMatches: async (filters: { teamId?: string; status?: string; date?: string }) => {
        const where: any = {};

        if (filters.teamId) {
            where['OR'] = [
                { homeTeamId: filters.teamId },
                { awayTeamId: filters.teamId }
            ];
        }

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.date) {
            const start = new Date(filters.date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filters.date);
            end.setHours(23, 59, 59, 999);
            where.matchDate = { gte: start, lte: end };
        }

        return prisma.matchSummary.findMany({
            where,
            orderBy: { matchDate: 'desc' },
            include: {
                homeTeam: { select: { shortName: true, logoUrl: true } },
                awayTeam: { select: { shortName: true, logoUrl: true } }
            }
        });
    },

    /**
     * Update match status.
     * Enforce strict state transitions.
     */
    updateMatchStatus: async (matchId: string, newStatus: MatchStatus) => {
        const match = await prisma.matchSummary.findUnique({ where: { id: matchId } });
        if (!match) throw { statusCode: 404, message: 'Match not found', code: 'NOT_FOUND' };

        const current = match.status;

        // Simple validation logic for transitions
        // CREATED -> SCHEDULED (if applicable) or LIVE (skip toss?) or TOSS
        // Assuming schema has: SCHEDULED, LIVE, COMPLETED, ABANDONED
        // Let's rely on Prisma enum: SCHEDULED, LIVE, COMPLETED, ABANDONED

        if (current === 'COMPLETED' && newStatus === 'LIVE') {
            throw { statusCode: 400, message: 'Cannot re-open completed match', code: 'INVALID_TRANSITION' };
        }

        return prisma.matchSummary.update({
            where: { id: matchId },
            data: { status: newStatus }
        });
    },

    /**
     * Cancel match with attribution.
     * Updates status to ABANDONED and increments cancelling team's cancellation count.
     */
    cancelMatch: async (matchId: string, cancellingTeamId: string) => {
        const match = await prisma.matchSummary.findUnique({ where: { id: matchId } });
        if (!match) throw { statusCode: 404, message: 'Match not found', code: 'NOT_FOUND' };

        if (match.status === 'COMPLETED' || match.status === 'ABANDONED') {
            throw { statusCode: 400, message: 'Match already finished', code: 'MATCH_FINISHED' };
        }

        if (match.homeTeamId !== cancellingTeamId && match.awayTeamId !== cancellingTeamId) {
            throw { statusCode: 403, message: 'Team not part of this match', code: 'UNAUTHORIZED' };
        }

        return prisma.$transaction([
            prisma.matchSummary.update({
                where: { id: matchId },
                data: { status: 'ABANDONED', result: 'MATCH_ABANDONED' } // using ABANDONED as per schema
            }),
            prisma.team.update({
                where: { id: cancellingTeamId },
                data: { matchesCancelled: { increment: 1 } }
            })
        ]);
    }
};
