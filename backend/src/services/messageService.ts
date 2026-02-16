import { prisma } from '../utils/db.js';
import { redisClient } from './presenceService.js';
// import { MessageType } from '@prisma/client'; 

const DEDUP_PREFIX = 'message:dedup:';
const DEDUP_TTL = 600; // 10 minutes

export const messageService = {
    /**
     * Save Message with Idempotency Check.
     */
    saveMessage: async (
        senderId: string,
        conversationId: string,
        content: string,
        clientMessageId: string,
        type: 'TEXT' | 'IMAGE' | 'AUDIO' = 'TEXT',
        mediaUrl?: string
    ) => {
        // 1. Check Deduplication
        const existingId = await redisClient.get(`${DEDUP_PREFIX}${clientMessageId}`);
        if (existingId) {
            // Fetch and return existing message
            return prisma.message.findUnique({
                where: { id: existingId },
                include: { sender: { select: { id: true, fullName: true, phoneNumber: true } } }
            });
        }

        // 2. Validate Membership
        const member = await prisma.conversationMember.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: senderId
                }
            }
        });

        if (!member) {
            throw new Error('User is not a member of this conversation');
        }

        // 3. Create Message
        const message = await prisma.message.create({
            data: {
                conversation: { connect: { id: conversationId } },
                sender: { connect: { id: senderId } },
                content,
                type: type as any,
                mediaUrl,
                mentions: []
            } as any,
            include: {
                sender: { select: { id: true, fullName: true, phoneNumber: true } }
            }
        });

        // 4. Save Deduplication Key
        await redisClient.setex(`${DEDUP_PREFIX}${clientMessageId}`, DEDUP_TTL, message.id);

        // 5. Update Conversation UpdatedAt
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        return message;
    },

    /**
     * Fetch Conversation History.
     */
    getHistory: async (conversationId: string, limit = 50, beforeId?: string) => {
        return prisma.message.findMany({
            where: {
                conversationId,
                ...(beforeId ? { id: { lt: beforeId } } : {})
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, fullName: true } }
            }
        });
    },

    /**
     * Search Messages.
     */
    searchMessages: async (conversationId: string, query: string) => {
        // Full text search via MongoDB text index would be ideal.
        // Prisma support for Mongo Raw queries or `contains`.
        // Using `contains` for MVP.
        return prisma.message.findMany({
            where: {
                conversationId,
                content: { contains: query, mode: 'insensitive' }
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { id: true, fullName: true } } }
        });
    }
};
