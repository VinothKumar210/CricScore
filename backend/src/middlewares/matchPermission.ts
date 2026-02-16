import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db.js';
import { sendError } from '../utils/response.js';

// Reusing TeamMemberRole type for consistency
type TeamMemberRole = 'OWNER' | 'CAPTAIN' | 'VICE_CAPTAIN' | 'PLAYER';

/**
 * Middleware to ensure the user has permission to modify the match.
 * Typically check if user is OWNER/CAPTAIN of either Home or Away team.
 * 
 * @param allowedRoles e.g. ['OWNER', 'CAPTAIN']
 */
export const requireMatchRole = (allowedRoles: TeamMemberRole[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            const matchId = req.params.id as string;

            if (!userId) return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
            if (!matchId) return sendError(res, 'Match ID missing', 400, 'MISSING_PARAM');

            const match = await prisma.matchSummary.findUnique({
                where: { id: matchId },
                select: { homeTeamId: true, awayTeamId: true },
            });

            if (!match) return sendError(res, 'Match not found', 404, 'NOT_FOUND');

            // Check if user is member of Home OR Away team with required role
            const member = await prisma.teamMember.findFirst({
                where: {
                    userId,
                    teamId: { in: [match.homeTeamId, match.awayTeamId].filter((id): id is string => !!id) },
                    role: { in: allowedRoles as any },
                },
            });

            if (!member) {
                return sendError(res, 'Insufficient match permissions', 403, 'FORBIDDEN');
            }

            next();
        } catch (error) {
            console.error('[MatchPermission] Error:', error);
            return sendError(res, 'Permission check failed', 500, 'INTERNAL_ERROR');
        }
    };
};
