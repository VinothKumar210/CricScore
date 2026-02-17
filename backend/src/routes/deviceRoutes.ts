import { Router } from 'express';
import { pushService } from '../services/pushService.js';
import { requireAuth } from '../middlewares/auth.js';

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
router.delete('/:token', requireAuth, async (req, res) => {
    try {
        const { token } = req.params;
        await pushService.unregisterDevice(token as string);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
