import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as inviteService from '../services/inviteService.js';
// import { BallType } from '@prisma/client';

const router = express.Router();

// POST /api/invites
router.post('/', requireAuth, async (req, res) => {
    try {
        const { teamId, preferredDate, preferredTime, overs, ballType, message, latitude, longitude, radius, expiresAt } = req.body;
        // Verify user is captain/owner of teamId (Missing permissions check, Todo)
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
router.patch('/:id/close', requireAuth, async (req, res) => {
    try {
        const { teamId } = req.body; // Security risk: user can send any teamId. Should fetch user teams.
        await inviteService.closeInvite(req.params.id as string, teamId as any);
        res.json({ message: 'Invite closed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/invites/:id/respond
router.post('/:id/respond', requireAuth, async (req, res) => {
    try {
        const { responderTeamId, status, proposal } = req.body;
        // Verify user is captain of responderTeamId
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
