import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from '../services/presenceService.js';
import { Redis } from 'ioredis';
import admin from 'firebase-admin';
import { prisma } from '../utils/db.js';
import { presenceService } from '../services/presenceService.js';
import { registerMessageHandlers } from './messageHandlers.js';
import { initScoringBroadcast, registerScoringHandlers } from './scoringHandlers.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();

export let io: Server;

// Heartbeat interval for presence TTL refresh (15 seconds)
const HEARTBEAT_INTERVAL_MS = 15_000;

export const initSocket = (httpServer: any) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST']
        },
        adapter: createAdapter(pubClient, subClient)
    });

    // Initialize scoring broadcast (dependency injection)
    initScoringBroadcast(io);
    registerScoringHandlers(io);

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

        // Set Online (with TTL)
        await presenceService.setUserOnline(user.id, socket.id);

        // Heartbeat: Refresh presence TTL every 15 seconds
        const heartbeatTimer = setInterval(async () => {
            try {
                await presenceService.refreshPresence(user.id);
            } catch (e) {
                // Non-critical — TTL will expire naturally
            }
        }, HEARTBEAT_INTERVAL_MS);

        // (Obsolete chatHandlers removed)

        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${user.id}`);

            // Stop heartbeat
            clearInterval(heartbeatTimer);

            // Immediate cleanup
            await presenceService.setUserOffline(user.id);
        });
    });

    // ---------------------------------------------------------
    // New Authoritative Messaging Namespace (/messages)
    // ---------------------------------------------------------
    const messageNamespace = io.of('/messages');

    messageNamespace.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            const user = await prisma.user.findUnique({ where: { firebaseUid: decodedToken.uid } });
            if (!user) return next(new Error('User not found'));
            (socket as any).user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    messageNamespace.on('connection', async (socket) => {
        const user = (socket as any).user;
        console.log(`[Messages Namespace] User connected: ${user.id}`);

        socket.join(`user:${user.id}`);
        await presenceService.setUserOnline(user.id, socket.id);

        const heartbeatTimer = setInterval(async () => {
            try {
                await presenceService.refreshPresence(user.id);
            } catch (e) { }
        }, HEARTBEAT_INTERVAL_MS);

        registerMessageHandlers(io, socket, user);

        socket.on('disconnect', async () => {
            console.log(`[Messages Namespace] User disconnected: ${user.id}`);
            clearInterval(heartbeatTimer);
            await presenceService.setUserOffline(user.id);
        });
    });

    // Integrated Event Bus for Real-Time Notifications
    import('../events/eventBus.js').then(({ eventBus }) => {
        // Remove existing listeners to prevent duplicates (if hot reloaded)
        eventBus.removeAllListeners('notification.created');

        eventBus.on('notification.created', (notification) => {
            // Emit to /chat namespace
            io.of('/chat').to(`user:${notification.userId}`).emit('notification:new', notification);
            console.log(`🔔 Notification emitted to user:${notification.userId}`);
        });
    });

    return io;
};
