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
    },

    /**
     * Get all member userIds for a conversation (for broadcasting)
     */
    getConversationMembers: async (conversationId: string): Promise<string[]> => {
        const members = await prisma.conversationMember.findMany({
            where: { conversationId },
            select: { userId: true }
        });
        return members.map(m => m.userId);
    },

    /**
     * Mark a conversation as read by updating lastReadMessageId
     */
    markAsRead: async (userId: string, conversationId: string) => {
        // Find the latest message in the conversation
        const latestMessage = await prisma.message.findFirst({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        });

        if (!latestMessage) return;

        await prisma.conversationMember.updateMany({
            where: {
                conversationId,
                userId
            },
            data: {
                lastReadMessageId: latestMessage.id
            }
        });
    },

    /**
     * Get unread counts for all conversations a user belongs to
     */
    getUnreadCounts: async (userId: string) => {
        // Get all conversations the user is a member of
        const memberships = await prisma.conversationMember.findMany({
            where: { userId },
            select: {
                conversationId: true,
                lastReadMessageId: true,
                conversation: {
                    select: { lastMessageAt: true }
                }
            }
        });

        const perConversation: Record<string, number> = {};
        let total = 0;

        for (const membership of memberships) {
            let count = 0;

            if (!membership.lastReadMessageId) {
                // Never read — count ALL messages not sent by the user
                count = await prisma.message.count({
                    where: {
                        conversationId: membership.conversationId,
                        senderId: { not: userId }
                    }
                });
            } else {
                // Count messages created AFTER the last-read message
                const lastReadMessage = await prisma.message.findUnique({
                    where: { id: membership.lastReadMessageId },
                    select: { createdAt: true }
                });

                if (lastReadMessage) {
                    count = await prisma.message.count({
                        where: {
                            conversationId: membership.conversationId,
                            senderId: { not: userId },
                            createdAt: { gt: lastReadMessage.createdAt }
                        }
                    });
                }
            }

            if (count > 0) {
                perConversation[membership.conversationId] = count;
                total += count;
            }
        }

        return { total, perConversation };
    }

};
