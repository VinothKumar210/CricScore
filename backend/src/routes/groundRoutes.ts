import express from 'express';
import { requireAuth } from '../middlewares/auth.js'; // Assuming auth middleware exists
import * as locationService from '../services/locationService.js';
// import { PitchType } from '@prisma/client';

const router = express.Router();

// POST /api/grounds
router.post('/', requireAuth, async (req, res) => {
    try {
        const { teamId, name, address, latitude, longitude, pitchType, photos } = req.body;
        // Validation?
        const ground = await locationService.createGround(
            teamId, name, address, parseFloat(latitude as any), parseFloat(longitude as any), pitchType as any, photos
        );
        res.status(201).json(ground);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/grounds/:id
router.get('/:id', async (req, res) => {
    try {
        const ground = await locationService.getGround(req.params.id as string);
        if (!ground) return res.status(404).json({ message: 'Ground not found' });
        res.json(ground);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/grounds?teamId=
router.get('/', async (req, res) => {
    try {
        const { teamId } = req.query;
        if (teamId) {
            const grounds = await locationService.getGroundsByTeam(teamId as any);
            return res.json(grounds);
        }
        res.json([]); // Or return all public?
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/grounds/:id
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        // Todo: Verify ownership (Owner/Captain of teamId)
        const ground = await locationService.updateGround(req.params.id as string, req.body);
        res.json(ground);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/grounds/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        // Todo: Verify ownership
        await locationService.deleteGround(req.params.id as string);
        res.json({ message: 'Ground deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
