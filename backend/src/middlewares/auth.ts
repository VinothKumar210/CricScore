import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth, RequireAuthProp } from '@clerk/clerk-sdk-node'; // or '@clerk/express' depending on version
import { userService } from '../services/userService';
import { sendError } from '../utils/response';
import { prisma } from '../utils/db';

// Custom middleware to sync Clerk user with our DB
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Verify Token (using Clerk's middleware logic manually or wrapper)
    // For simplicity with @clerk/express, we assume app.use(ClerkExpressRequireAuth()) is called globally or we wrap it here.
    // But strictly, we want a custom one that does the DB lookup.

    // Actually, let's use the explicit Clerk middleware first to populate req.auth
    // This function assumes req.auth is already populated by ClerkExpressRequireAuth() or similar.
    // BUT the prompt asked to "Implement ClerkExpressRequireAuth middleware" AND "Create custom middleware".

    if (!req.auth || !req.auth.userId) {
        return sendError(res, "Unauthorized", 401);
    }

    const clerkId = req.auth.userId;

    try {
        // 2. Find User in DB
        let user = await userService.findByClerkId(clerkId);

        // 3. Auto-Create if missing (Fallback for webhooks failure)
        if (!user) {
            // We might not have email/phone here easily without fetching from Clerk API.
            // For efficiency, we create a stub and let Webhook fill details later, 
            // OR fetch from Clerk API now. Fetching is safer for "first login".
            // Let's create a basic user.
            // For now, we'll try to get details from Clerk if possible, but the SDK on backend
            // allows `clerkClient.users.getUser(clerkId)`.

            // Let's just create a minimal record to allow the request to proceed.
            // The webhook should have ideally handled this.
            console.warn(`[Auth] User ${clerkId} not found in DB. Auto-creating stub.`);
            user = await prisma.user.create({
                data: {
                    clerkId,
                    email: `temp_${clerkId}@cricscore.app`, // Placeholder
                    fullName: 'New User',
                    onboardingComplete: false,
                }
            });
        }

        // 4. Attach to Request
        req.user = user;
        next();
    } catch (error) {
        console.error("[AuthMiddleware] Error:", error);
        return sendError(res, "Authentication Error", 500);
    }
};
