import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Protected Routes
// Firebase token is verified by requireAuth middleware
router.get('/auth/me', requireAuth, (req, res) => {
    return sendSuccess(res, { user: req.user });
});

export default router;
