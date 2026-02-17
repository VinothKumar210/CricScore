import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as apiKeyService from '../services/apiKeyService.js';

const router = express.Router();

// GET /api/keys - List keys
router.get('/', requireAuth, async (req, res) => {
    try {
        const keys = await apiKeyService.listApiKeys((req as any).user.uid);
        res.json(keys);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/keys - Create key
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, permissions } = req.body;
        // Validate permissions against allowed list?
        const allowedPermissions = ['read:matches', 'read:stats', 'read:leaderboard'];
        const perms: string[] = Array.isArray(permissions) ? permissions : [];
        const validPerms = perms.filter(p => allowedPermissions.includes(p));

        const result = await apiKeyService.createApiKey((req as any).user.uid, name, validPerms);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/keys/:id - Revoke key
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await apiKeyService.revokeApiKey((req as any).user.uid, req.params.id as string);
        res.json({ message: 'API Key revoked' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
