import { prisma } from '../utils/db.js';
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
    }
};
