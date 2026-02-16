import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from '../services/presenceService.js';
import { Redis } from 'ioredis';
import admin from 'firebase-admin';
import { prisma } from '../utils/db.js';
import { presenceService } from '../services/presenceService.js';
import { registerChatHandlers } from './chatHandlers.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();

export let io: Server;

export const initSocket = (httpServer: any) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST']
        },
        adapter: createAdapter(pubClient, subClient)
    });

    const chatNamespace = io.of('/chat');

    // Auth Middleware
    chatNamespace.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            // Verify user exists in DB
            const user = await prisma.user.findUnique({ where: { firebaseUid: decodedToken.uid } });
            if (!user) return next(new Error('User not found'));

            // Attach user to socket
            (socket as any).user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    // Connection Handler
    chatNamespace.on('connection', async (socket) => {
        const user = (socket as any).user;
        console.log(`User connected: ${user.id}`);

        // Join personal room
        socket.join(`user:${user.id}`);

        // Set Online
        await presenceService.setUserOnline(user.id, socket.id);

        // Register Handlers
        registerChatHandlers(io, socket, user);

        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${user.id}`);
            await presenceService.setUserOffline(user.id);
        });
    });

    return io;
};
