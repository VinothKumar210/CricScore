import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db.js';
import { sendError } from '../utils/response.js';

// Define TeamMemberRole enum manually since we can't import it directly from @prisma/client if it's not generated yet or to avoid dependency issues.
// Ideally, import { TeamMemberRole } from '@prisma/client';
type TeamMemberRole = 'OWNER' | 'CAPTAIN' | 'VICE_CAPTAIN' | 'PLAYER';

const ROLE_HIERARCHY: Record<TeamMemberRole, number> = {
    OWNER: 4,
    CAPTAIN: 3,
    VICE_CAPTAIN: 2,
    PLAYER: 1,
};

/**
 * Middleware to ensure the authenticated user has a specific role (or higher) in the team.
 * @param allowedRoles List of roles allowed to access the route.
 */
export const requireTeamRole = (allowedRoles: TeamMemberRole[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            const teamId = req.params.id || req.body.teamId; // Usually in URL param

            if (!userId) {
                return sendError(res, 'User not authenticated', 401, 'UNAUTHORIZED');
            }

            if (!teamId) {
                return sendError(res, 'Team ID is missing', 400, 'MISSING_PARAM');
            }

            const member = await prisma.teamMember.findUnique({
                where: {
                    teamId_userId: {
                        teamId,
                        userId,
                    },
                },
            });

            if (!member) {
                return sendError(res, 'You are not a member of this team', 403, 'NOT_MEMBER');
            }

            // Check if user's role is in the allowed list
            if (!allowedRoles.includes(member.role as TeamMemberRole)) {
                return sendError(res, 'Insufficient permissions', 403, 'FORBIDDEN');
            }

            // Attach member info to request for downstream use
            (req as any).member = member;
            next();
        } catch (error) {
            console.error('[PermissionMiddleware] Error:', error);
            return sendError(res, 'Permission check failed', 500, 'INTERNAL_ERROR');
        }
    };
};
