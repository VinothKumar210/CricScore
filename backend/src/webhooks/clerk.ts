import type { Request, Response } from 'express';
import { Webhook } from 'svix';
import { userService } from '../services/userService.js';
import { sendError, sendSuccess } from '../utils/response.js';

export const clerkWebhookHandler = async (req: Request, res: Response) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        console.error('Missing CLERK_WEBHOOK_SECRET');
        return sendError(res, 'Server Configuration Error', 500);
    }

    // Get headers
    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return sendError(res, 'Missing Webhook Headers', 400);
    }

    // Verify Payload
    const payload = req.body;
    const body = JSON.stringify(payload);
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        });
    } catch (err) {
        console.error('Webhook Verification Failed:', err);
        return sendError(res, 'Invalid Signature', 400);
    }

    const eventType = evt.type;

    try {
        if (eventType === 'user.created' || eventType === 'user.updated') {
            const { id, ...attributes } = evt.data;
            await userService.syncUser(evt.data);
            console.log(`[Webhook] Synced user ${id}`);
        }

        return sendSuccess(res, { received: true });
    } catch (error) {
        console.error('[Webhook] Processing Error:', error);
        return sendError(res, 'Webhook Processing Failed', 500);
    }
};
