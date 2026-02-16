import { Router } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { requireAuth } from '../middlewares/auth';
import { clerkWebhookHandler } from '../webhooks/clerk';
import { sendSuccess } from '../utils/response';

const router = Router();

// Webhook (Public, but verifies signature)
// Note: Body parser must handle raw body for verification if using raw payload, 
// but here we used JSON.stringify(req.body) in handler which assumes bodyParser.json() is used.
router.post('/webhooks/clerk', clerkWebhookHandler);

// Protected Routes
// We chain Clerk's middleware (populates req.auth) -> Our middleware (populates req.user)
router.get('/auth/me', ClerkExpressRequireAuth(), requireAuth, (req, res) => {
    return sendSuccess(res, { user: req.user });
});

export default router;
