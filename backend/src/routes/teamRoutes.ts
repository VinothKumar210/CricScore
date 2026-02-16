import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireTeamRole } from '../middlewares/permission.js';
import { teamService } from '../services/teamService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { generateQRCode } from '../utils/joinCodeGenerator.js';

const router = Router();

// --- Team CRUD ---

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/teams', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id; // Guaranteed by requireAuth
        const { name, city, shortName } = req.body;

        if (!name) {
            return sendError(res, 'Team name is required', 400, 'MISSING_PARAM');
        }

        const team = await teamService.createTeam(userId, { name, city, shortName });
        return sendSuccess(res, { team }, 201);
    } catch (error: any) {
        console.error('[TeamRoutes] Create error:', error);
        return sendError(res, 'Failed to create team', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/teams/:id
 * Get team details + reliability score
 */
router.get('/teams/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const teamId = req.params.id as string;
        if (!teamId) return sendError(res, 'Team ID required', 400, 'MISSING_PARAM');

        const team = await teamService.getTeamDetails(teamId);

        if (!team) {
            return sendError(res, 'Team not found', 404, 'NOT_FOUND');
        }

        return sendSuccess(res, { team });
    } catch (error: any) {
        console.error('[TeamRoutes] Get details error:', error);
        return sendError(res, 'Failed to get team details', 500, 'INTERNAL_ERROR');
    }
});

/**
 * PATCH /api/teams/:id
 * Update team details (Owner/Captain)
 */
router.patch('/teams/:id', requireAuth, requireTeamRole(['OWNER', 'CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const teamId = req.params.id as string;
        if (!teamId) return sendError(res, 'Team ID required', 400, 'MISSING_PARAM');

        const updateData = req.body;
        // Basic filtering of allowed fields could be done here or service
        const allowedFields = ['name', 'shortName', 'city', 'description', 'bannerUrl', 'logoUrl'];
        const data: any = {};

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) data[field] = updateData[field];
        }

        const team = await teamService.updateTeam(teamId, data);
        return sendSuccess(res, { team });
    } catch (error: any) {
        console.error('[TeamRoutes] Update error:', error);
        return sendError(res, 'Failed to update team', 500, 'INTERNAL_ERROR');
    }
});

/**
 * DELETE /api/teams/:id
 * Delete team (Owner only)
 */
router.delete('/teams/:id', requireAuth, requireTeamRole(['OWNER']), async (req: Request, res: Response) => {
    try {
        const teamId = req.params.id as string;
        if (!teamId) return sendError(res, 'Team ID required', 400, 'MISSING_PARAM');

        await teamService.deleteTeam(teamId);
        return sendSuccess(res, { message: 'Team deleted successfully' });
    } catch (error: any) {
        console.error('[TeamRoutes] Delete error:', error);
        return sendError(res, 'Failed to delete team', 500, 'INTERNAL_ERROR');
    }
});

// --- Member Management ---

/**
 * POST /api/teams/:id/members
 * Add user directly (Owner/Captain/Vice Captain)
 */
router.post('/teams/:id/members', requireAuth, requireTeamRole(['OWNER', 'CAPTAIN', 'VICE_CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const teamId = req.params.id as string;
        if (!teamId) return sendError(res, 'Team ID required', 400, 'MISSING_PARAM');

        const { userId, role } = req.body;

        if (!userId) {
            return sendError(res, 'User ID is required', 400, 'MISSING_PARAM');
        }

        // Only Owner can assign Owner/Captain roles ideally, let's keep it simple or check permissions further
        // Assuming implementation trusts the caller role checks. 
        // Improvement: Check if `req.user` role >= newRole hierarchy

        const member = await teamService.addMember(teamId, userId, role);
        return sendSuccess(res, { member }, 201);
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        return sendError(res, 'Failed to add member', 500, 'INTERNAL_ERROR');
    }
});

/**
 * DELETE /api/teams/:id/members/:memberId
 * Remove member
 */
router.delete('/teams/:id/members/:memberId', requireAuth, requireTeamRole(['OWNER', 'CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const teamId = req.params.id as string;
        const memberId = req.params.memberId as string;

        if (!teamId || !memberId) return sendError(res, 'Missing parameters', 400, 'MISSING_PARAM');

        // Additional logic: Captain cannot remove Owner. 
        // This logic is best placed in service or here. 
        // Service's `removeMember` checks for Last Owner.
        // We need to check if the target member is higher rank than current user.
        // For now, relying on basic role check + service logic.

        await teamService.removeMember(teamId, memberId);
        return sendSuccess(res, { message: 'Member removed' });
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        return sendError(res, 'Failed to remove member', 500, 'INTERNAL_ERROR');
    }
});

/**
 * PATCH /api/teams/:id/members/:memberId
 * Update member role (Owner/Captain)
 */
router.patch('/teams/:id/members/:memberId', requireAuth, requireTeamRole(['OWNER', 'CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const teamId = req.params.id as string;
        const memberId = req.params.memberId as string;

        if (!teamId || !memberId) return sendError(res, 'Missing parameters', 400, 'MISSING_PARAM');

        const { role } = req.body;

        if (!role) return sendError(res, 'Role is required', 400, 'MISSING_PARAM');

        const member = await teamService.updateMemberRole(teamId, memberId, role);
        return sendSuccess(res, { member });
    } catch (error: any) {
        console.error('[TeamRoutes] Update role error:', error);
        return sendError(res, 'Failed to update user role', 500, 'INTERNAL_ERROR');
    }
});

// --- Join Logic ---

/**
 * POST /api/teams/join
 * Join via code
 */
router.post('/teams/join', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { joinCode } = req.body;

        if (!joinCode) {
            return sendError(res, 'Join code is required', 400, 'MISSING_PARAM');
        }

        const member = await teamService.joinTeamByCode(userId, joinCode);
        return sendSuccess(res, { member });
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        return sendError(res, 'Failed to join team', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/teams/:id/qr
 * Get QR code for joining
 */
router.get('/teams/:id/qr', requireAuth, async (req: Request, res: Response) => {
    try {
        const teamId = req.params.id as string;
        if (!teamId) return sendError(res, 'Team ID required', 400, 'MISSING_PARAM');

        const team = await teamService.getTeamDetails(teamId);

        if (!team) return sendError(res, 'Team not found', 404, 'NOT_FOUND');

        // Check permission: Any member can see/share QR? Or just admins?
        // Let's allow any member for now to facilitate growth.

        const qrCodeDataUrl = await generateQRCode(team.inviteCode);

        return sendSuccess(res, {
            inviteCode: team.inviteCode,
            qrCode: qrCodeDataUrl
        });
    } catch (error: any) {
        return sendError(res, 'Failed to generate QR', 500, 'INTERNAL_ERROR');
    }
});

export default router;
