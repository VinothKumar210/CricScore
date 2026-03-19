import { prisma } from '../utils/db.js';
import { redisClient } from './presenceService.js';
import type { MatchSummary, MatchStatus } from '@prisma/client';

export const matchService = {
    /**
     * Create a new match.
     * - homeTeamId must be a valid Team ObjectID.
     * - awayTeamName is a free-text name (no DB lookup).
     * - matchType/ballType must be valid Prisma enums.
     */
    createMatch: async (userId: string, data: any) => {
        const {
            matchType,
            homeTeamId,
            overs,
            ballType,
            powerplayEnabled,
            venue,
            matchDate,
            homeTeamName,
            awayTeamName,
            tossWinner,
            tossDecision,
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
        if (overs <= 0) {
            throw { statusCode: 400, message: 'Overs must be positive', code: 'INVALID_OVERS' };
        }

        // Look up home team — must be a real team in DB
        const home = await prisma.team.findUnique({ where: { id: homeTeamId } }).catch(() => null);
        if (!home) {
            throw { statusCode: 400, message: 'Home team not found. Please select a valid team.', code: 'INVALID_HOME_TEAM' };
        }

        // Verify the user is actually a member of the home team
        const membership = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId: home.id, userId: userId } }
        });
        if (!membership) {
            throw { statusCode: 403, message: 'You must be a member of the selected home team to create a match.', code: 'NOT_TEAM_MEMBER' };
        }

        // Away team is name-based (casual/local matches don't require a DB team)
        const atName = (awayTeamName || '').trim() || 'Opponent';
        const htName = homeTeamName || home.name;

        return prisma.matchSummary.create({
            data: {
                matchType,
                homeTeamId: home.id,
                awayTeamId: null,       // No real away team record — name-based
                homeTeamName: htName,
                awayTeamName: atName,
                overs,
                ballType,
                powerplayEnabled: !!powerplayEnabled,
                venue: venue || null,
                matchDate: new Date(matchDate || Date.now()),
                status: 'SCHEDULED',
                tossWinnerName: tossWinner || null,
                tossDecision: tossDecision || null,
                createdById: userId,
                tournamentFixtureId: data.tournamentFixtureId || null,
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

        if (current === 'COMPLETED' && newStatus === 'LIVE') {
            throw { statusCode: 400, message: 'Cannot re-open completed match', code: 'INVALID_TRANSITION' };
        }

        return prisma.matchSummary.update({
            where: { id: matchId },
            data: { status: newStatus }
        });
    },

    /**
     * Complete pre-match setup (e.g. toss details) and start match.
     */
    updateMatchSetup: async (matchId: string, tossWinnerName: string, tossDecision: string) => {
        const match = await prisma.matchSummary.findUnique({ where: { id: matchId } });
        if (!match) throw { statusCode: 404, message: 'Match not found', code: 'NOT_FOUND' };

        if (match.status !== 'SCHEDULED') {
            throw { statusCode: 400, message: 'Match is already started or complete', code: 'INVALID_TRANSITION' };
        }

        return prisma.matchSummary.update({
            where: { id: matchId },
            data: { 
                tossWinnerName, 
                tossDecision,
                status: 'LIVE' 
            }
        });
    },

    /**
     * Cancel match with attribution.
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
                data: { status: 'ABANDONED', result: 'MATCH_ABANDONED' }
            }),
            prisma.team.update({
                where: { id: cancellingTeamId },
                data: { matchesCancelled: { increment: 1 } }
            })
        ]);
    }
};
