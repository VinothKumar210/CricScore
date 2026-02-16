import { User } from '@prisma/client';

declare global {
    namespace Express {
        interface Request {
            user?: User;
            auth?: {
                userId: string;
                sessionId: string;
                getToken: () => Promise<string | null>;
            };
        }
    }
}
