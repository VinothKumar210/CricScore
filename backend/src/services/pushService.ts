import admin from 'firebase-admin';
import { prisma } from '../utils/db.js';

// Ensure Firebase Admin is initialized (It should be in app.ts/index.ts)
// process.env.GOOGLE_APPLICATION_CREDENTIALS must be set or initialized manually
if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (e) {
        console.error('Failed to initialize Firebase Admin:', e);
    }
}

export const pushService = {
    /**
     * Send Push Notification to a user's devices.
     * Auto-cleans invalid tokens.
     */
    sendPushNotification: async (userId: string, payload: { title: string; body: string; data?: Record<string, string> }) => {
        try {
            // 1. Fetch Devices
            const devices = await prisma.device.findMany({
                where: { userId },
                select: { token: true }
            });

            if (devices.length === 0) return;

            const tokens = devices.map((d: { token: string }) => d.token);

            // 2. Send Multicast (Fire-and-forget style)
            // Note: 'data' values must be strings
            const dataPayload = payload.data ?
                Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)]))
                : {};

            const message: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title: payload.title,
                    body: payload.body
                },
                data: dataPayload as any,
                android: { priority: 'high' },
                apns: {
                    payload: { aps: { contentAvailable: true } }
                }
            };

            const uniqueTokens = [...new Set(tokens)] as string[]; // admin sdks usually handle duplicates but safe to uniquify
            message.tokens = uniqueTokens;

            interface BatchResponse {
                failureCount: number;
                responses: { success: boolean; error?: { code: string } }[];
            }
            const response = await (admin.messaging() as any).sendMulticast(message) as BatchResponse;

            // 3. Cleanup Invalid Tokens
            if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp: { success: boolean; error?: { code: string } }, idx: number) => {
                    if (!resp.success) {
                        const error = resp.error;
                        if (error?.code === 'messaging/invalid-registration-token' ||
                            error?.code === 'messaging/registration-token-not-registered') {
                            const token = uniqueTokens[idx];
                            if (token) failedTokens.push(token);
                        }
                    }
                });

                if (failedTokens.length > 0) {
                    console.log(`🧹 Cleaning up ${failedTokens.length} invalid FCM tokens for user ${userId}`);
                    await prisma.device.deleteMany({
                        where: {
                            userId,
                            token: { in: failedTokens }
                        }
                    }).catch((err: any) => console.error('Failed to cleanup tokens:', err));
                }
            }

        } catch (error) {
            // Log & Swallow - Push failure shouldn't crash anything
            console.error('[PushService] Failed to send push:', error);
        }
    },

    /**
     * Register a device token.
     */
    registerDevice: async (userId: string, token: string, platform?: string) => {
        return prisma.device.upsert({
            where: {
                userId_token: { userId, token }
            },
            update: { updatedAt: new Date(), platform },
            create: { userId, token, platform }
        } as any);
    },

    /**
     * Unregister a device token.
     */
    unregisterDevice: async (token: string) => {
        return prisma.device.deleteMany({
            where: { token }
        });
    }
};
