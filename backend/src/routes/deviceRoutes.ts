import { Router } from 'express';
import { pushService } from '../services/pushService.js';
import { requireAuth } from '../middlewares/auth.js';
import { prisma } from '../utils/db.js';

const router = Router();

// Register Device
router.post('/register', requireAuth, async (req: any, res) => {
    try {
        const { token, platform } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required' });

        await pushService.registerDevice(req.user.uid, token, platform);
        res.json({ success: true });
    } catch (error) {
        console.error('Device registration failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Unregister Device
router.delete('/:token', requireAuth, async (req: any, res) => {
    try {
        const { token } = req.params;
        const userId = req.user.id;

        // FIX 6: Scope to userId
        // Assuming pushService.unregisterDevice might delete by token only. 
        // We should delete ONLY if it belongs to user.
        // Or if pushService doesn't accept userId, we do it here via Prisma directly or update service.
        // Let's check pushService.unregisterDevice implementation? 
        // It likely does 'deleteMany({ where: { token } })'.
        // Users requested: replace with deleteMany where token & userId.
        // Since we are in routes, better to call prisma directly here OR update service.
        // Service should handle business logic. Let's update ROUTE to call prisma directly as per prompt?
        // Prompt said "Replace: await prisma.device.deleteMany...". 
        // I need to import prisma in deviceRoutes.ts

        await prisma.device.deleteMany({
            where: {
                token,
                userId
            }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
