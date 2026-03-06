import { prisma } from '../utils/db.js';

export const messageService = {

    /**
     * Validate Conversation Membership dynamically
     */
    validateConversationMembership: async (userId: string, conversationId: string): Promise<boolean> => {
        if (!userId || !conversationId) return false;

        const member = await prisma.conversationMember.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        });

        return !!member;
    },

    /**
     * Save Message with Client Nonce Idempotency Guard
     */
    saveMessage: async (
        senderId: string,
        conversationId: string,
        content: string,
        clientNonce?: string
    ) => {
        // 1. Validate Membership
        const isMember = await messageService.validateConversationMembership(senderId, conversationId);
        if (!isMember) {
            throw new Error('User is not authorized for this conversation');
        }

        // 2. Idempotent POST Check via clientNonce
        if (clientNonce) {
            const existing = await prisma.message.findFirst({
                where: {
                    senderId,
                    clientNonce
                } as any,
                include: {
                    sender: { select: { id: true, fullName: true, phoneNumber: true, profilePictureUrl: true } },
                    conversation: { select: { type: true, entityId: true } }
                }
            });

            if (existing) {
                return existing; // Double-submit guarded natively
            }
        }

        // 3. Persist natively bypassing in-memory race risks
        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId,
                content,
                clientNonce: clientNonce ?? null
            } as any,
            include: {
                sender: { select: { id: true, fullName: true, phoneNumber: true, profilePictureUrl: true } },
                conversation: { select: { type: true, entityId: true } }
            }
        });

        // 4. Update conversation lastMessageAt
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: message.createdAt }
        });

        return message;
    },

    /**
     * Fetch Conversation History via Dual Pagination (Cursor or After Timestamp)
     */
    getHistory: async (
        conversationId: string,
        limit = 50,
        cursor?: string,
        after?: string
    ) => {
        const whereClause: any = {
            conversationId
        };

        // Dual Pagination Logic
        if (after) {
            const date = new Date(after);
            if (!isNaN(date.getTime())) {
                whereClause.createdAt = { gt: date };
            }
        } else if (cursor) {
            whereClause.id = { lt: cursor };
        }

        return prisma.message.findMany({
            where: whereClause,
            take: limit,
            orderBy: { createdAt: 'asc' }, // RULE 5: Deterministic ASC sorting
            include: {
                sender: { select: { id: true, fullName: true, phoneNumber: true, profilePictureUrl: true } },
                conversation: { select: { type: true, entityId: true } }
            }
        });
    }

};
