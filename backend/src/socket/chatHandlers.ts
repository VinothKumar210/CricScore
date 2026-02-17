import { Server, Socket } from 'socket.io';
import { messageService } from '../services/messageService.js';
import { prisma } from '../utils/db.js';
import { redisClient } from '../services/presenceService.js';

// Typing indicator TTL — auto-clears if client never sends typing:stop
const TYPING_TTL_SECONDS = 5;
const TYPING_PREFIX = 'typing:';

export const registerChatHandlers = (io: Server, socket: Socket, user: any) => {

    // Join Conversation
    socket.on('join:conversation', async ({ conversationId }) => {
        try {
            // Verify membership
            const member = await prisma.conversationMember.findUnique({
                where: {
                    conversationId_userId: {
                        conversationId,
                        userId: user.id
                    }
                }
            });

            if (member) {
                await socket.join(`conversation:${conversationId}`);
                socket.emit('joined:conversation', { conversationId });
            } else {
                socket.emit('error', { message: 'Not a member' });
            }
        } catch (error) {
            socket.emit('error', { message: 'Failed to join conversation' });
        }
    });

    // Send Message
    socket.on('message:send', async (payload) => {
        const { clientMessageId, conversationId, content, type, mediaUrl } = payload;

        try {
            // RATE LIMIT: 10 messages per 5 seconds
            const now = Date.now();
            const windowStart = now - 5000;
            const rateKey = `chat:rate:${conversationId}:${user.id}`;

            const pipeline = redisClient.pipeline();
            pipeline.zremrangebyscore(rateKey, 0, windowStart);
            pipeline.zcard(rateKey);
            pipeline.zadd(rateKey, now, `${now}-${Math.random()}`); // Unique member
            pipeline.expire(rateKey, 10); // Auto-cleanup

            const results = await pipeline.exec();
            // results[1][1] is count AFTER removing old but BEFORE adding new? 
            // No, exec runs in order. 
            // zcard is index 1. 
            // If count > 10, invalid.
            const count = (results?.[1]?.[1] as number) || 0;

            if (count > 10) {
                socket.emit('error', {
                    clientMessageId,
                    message: 'Rate limit exceeded. Slow down.',
                    code: 'RATE_LIMIT'
                });
                return;
            }

            const message = await messageService.saveMessage(
                user.id,
                conversationId,
                content,
                clientMessageId,
                type || 'TEXT',
                mediaUrl
            );

            // Broadcast to room
            const nsp = socket.nsp;
            nsp.to(`conversation:${conversationId}`).emit('message:new', message);

            // Ack to sender
            socket.emit('message:ack', { clientMessageId, messageId: message?.id, status: 'SENT' });

        } catch (error: any) {
            console.error('Message send error:', error);
            socket.emit('error', {
                clientMessageId,
                message: error.message || 'Failed to send message'
            });
        }
    });

    // Typing Indicators (Redis-backed with TTL)
    socket.on('typing:start', async ({ conversationId }) => {
        try {
            // Store in Redis with 5-second auto-expire
            await redisClient.setex(
                `${TYPING_PREFIX}${conversationId}:${user.id}`,
                TYPING_TTL_SECONDS,
                '1'
            );
        } catch (e) {
            // Fail-open: typing indicator is non-critical
        }

        socket.to(`conversation:${conversationId}`).emit('typing:start', {
            conversationId,
            userId: user.id,
            name: user.fullName
        });
    });

    socket.on('typing:stop', async ({ conversationId }) => {
        try {
            await redisClient.del(`${TYPING_PREFIX}${conversationId}:${user.id}`);
        } catch (e) {
            // Fail-open
        }

        socket.to(`conversation:${conversationId}`).emit('typing:stop', {
            conversationId,
            userId: user.id
        });
    });
};
