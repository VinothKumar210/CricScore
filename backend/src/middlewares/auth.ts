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
        return sendError(res, 'Missing or invalid Authorization header', 401);
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
        return sendError(res, 'Missing token', 401);
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
            user = await prisma.user.create({
                data: {
                    firebaseUid,
                    email: decodedToken.email || `user_${firebaseUid}@cricscore.app`,
                    fullName: decodedToken.name || 'New User',
                    profilePictureUrl: decodedToken.picture || null,
                    onboardingComplete: false,
                },
            });
        }

        // 4. Attach to Request
        req.user = user;
        next();
    } catch (error) {
        console.error('[AuthMiddleware] Token verification failed:', error);
        return sendError(res, 'Invalid or expired token', 401);
    }
};
