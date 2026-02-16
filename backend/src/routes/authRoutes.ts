import type { Request, Response } from 'express';
import { Router } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { requireAuth } from '../middlewares/auth.js';
import { clerkWebhookHandler } from '../webhooks/clerk.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Webhook (Public, but verifies signature)
// Note: Body parser must handle raw body for verification if using raw payload, 
// but here we used JSON.stringify(req.body) in handler which assumes bodyParser.json() is used.
router.post('/webhooks/clerk', clerkWebhookHandler);

// Protected Routes
// We chain Clerk's middleware (populates req.auth) -> Our middleware (populates req.user)
router.get('/auth/me', ClerkExpressRequireAuth() as unknown as import('express').RequestHandler, requireAuth, (req, res) => {
    return sendSuccess(res, { user: req.user });
});

export default router;
