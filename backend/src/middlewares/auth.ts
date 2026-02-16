import type { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../utils/firebaseAdmin.js';
import { userService } from '../services/userService.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../utils/db.js';

/**
 * Firebase Auth middleware.
 * Verifies the Firebase ID token from the Authorization header,
 * finds or creates the user in the database, and attaches to req.user.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return sendError(res, 'Missing or invalid Authorization header', 401, 'NO_TOKEN');
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
        return sendError(res, 'Missing token', 401, 'NO_TOKEN');
    }

    try {
        // 1. Verify Firebase ID Token
        const decodedToken = await firebaseAuth.verifyIdToken(idToken);
        const firebaseUid = decodedToken.uid;

        // 2. Find User in DB
        let user = await userService.findByFirebaseUid(firebaseUid);

        // 3. Auto-Create if missing (first login)
        if (!user) {
            console.log(`[Auth] New user ${firebaseUid}. Creating record.`);

            // Extract phone number if available (Firebase phone auth)
            const phoneNumber = decodedToken.phone_number || null;

            user = await prisma.user.create({
                data: {
                    firebaseUid,
                    email: decodedToken.email || `user_${firebaseUid}@cricscore.app`,
                    phoneNumber,
                    fullName: decodedToken.name || 'New User',
                    profilePictureUrl: decodedToken.picture || null,
                    onboardingComplete: false,
                },
            });

            // Generate auto-username for new user
            const autoUsername = await userService.generateAutoUsername(user.fullName);
            user = await prisma.user.update({
                where: { id: user.id },
                data: { autoUsername },
            });
        }

        // 4. Update lastSeenAt (fire-and-forget, don't block request)
        userService.updateLastSeen(user.id).catch((err) => {
            console.error('[Auth] Failed to update lastSeenAt:', err);
        });

        // 5. Attach to Request
        req.user = user;
        next();
    } catch (error: any) {
        // Differentiate token errors
        if (error.code === 'auth/id-token-expired') {
            return sendError(res, 'Token expired', 401, 'TOKEN_EXPIRED');
        }
        if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
            return sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
        }

        console.error('[AuthMiddleware] Token verification failed:', error);
        return sendError(res, 'Authentication failed', 401, 'AUTH_FAILED');
    }
};
