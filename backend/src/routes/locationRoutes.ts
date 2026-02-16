import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as locationService from '../services/locationService.js';

const router = express.Router();

// POST /api/user/locations
router.post('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user!.id;
        const { label, latitude, longitude, isDefault, alertRadius } = req.body;
        const location = await locationService.addUserLocation(
            userId, label, parseFloat(latitude), parseFloat(longitude), isDefault, alertRadius
        );
        res.status(201).json(location);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/user/locations
router.get('/', requireAuth, async (req: any, res) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const locations = await locationService.getUserLocations(userId);
        res.json(locations);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/user/locations/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await locationService.deleteUserLocation(req.params.id as string);
        res.json({ message: 'Location deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
