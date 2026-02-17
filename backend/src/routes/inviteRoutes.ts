import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as inviteService from '../services/inviteService.js';
import { prisma } from '../utils/db.js';
// import { BallType } from '@prisma/client';

const router = express.Router();

// POST /api/invites
router.post('/', requireAuth, async (req: any, res) => {
    try {
        const { teamId, preferredDate, preferredTime, overs, ballType, message, latitude, longitude, radius, expiresAt } = req.body;

        // FIX 1: Verify user is authorized to create invite for this team
        const member = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId,
                    userId: req.user.id
                }
            }
        });

        if (!member || !['OWNER', 'CAPTAIN', 'VICE_CAPTAIN'].includes(member.role)) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to create invites for this team' });
        }

        const invite = await inviteService.createInvite(teamId, {
            preferredDate: preferredDate ? new Date(preferredDate) : undefined,
            preferredTime,
            overs: overs ? parseInt(overs) : undefined,
            ballType: ballType as any,
            message,
            latitude: parseFloat(latitude as any),
            longitude: parseFloat(longitude as any),
            radius: parseInt(radius as any),
            expiresAt: new Date(expiresAt)
        } as any);
        res.status(201).json(invite);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/invites/feed
router.get('/feed', requireAuth, async (req, res) => {
    try {
        const { latitude, longitude, radius, overs, ballType } = req.query;
        if (!latitude || !longitude) return res.status(400).json({ message: 'Lat/Lon required' });

        const feed = await inviteService.getFeed(
            parseFloat(latitude as any),
            parseFloat(longitude as any),
            {
                maxDistance: radius ? parseInt(radius as any) : undefined,
                overs: overs ? parseInt(overs as any) : undefined,
                ballType: ballType as any
            } as any
        );
        res.json(feed);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/invites/:id/close
router.patch('/:id/close', requireAuth, async (req: any, res) => {
    try {
        // FIX 3: Verify user owns the team linked to the invite
        // Fetch invite first to get teamId
        const invite = await prisma.matchSeeker.findUnique({ where: { id: req.params.id } });
        if (!invite) return res.status(404).json({ error: 'Invite not found' });

        const member = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: invite.teamId,
                    userId: req.user.id
                }
            }
        });

        if (!member || !['OWNER', 'CAPTAIN', 'VICE_CAPTAIN'].includes(member.role)) {
            return res.status(403).json({ error: 'Forbidden: You cannot close this invite' });
        }

        await inviteService.closeInvite(req.params.id as string, invite.teamId); // Pass verified teamId
        res.json({ message: 'Invite closed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/invites/:id/respond
router.post('/:id/respond', requireAuth, async (req: any, res) => {
    try {
        const { responderTeamId, status, proposal } = req.body;

        // FIX 2: Verify user is authorized for responderTeamId
        const member = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: responderTeamId,
                    userId: req.user.id
                }
            }
        });

        if (!member || !['OWNER', 'CAPTAIN', 'VICE_CAPTAIN'].includes(member.role)) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to respond for this team' });
        }

        const result = await inviteService.respondToInvite(
            req.params.id as string,
            responderTeamId as any,
            status,
            proposal
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
