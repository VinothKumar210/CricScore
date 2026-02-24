import { prisma } from '../utils/db.js';

export const reactionService = {
    /**
     * Toggle a reaction on a message.
     * If same emoji exists for user -> remove it.
     * If different emoji exists -> update it.
     * If no reaction -> create it.
     */
    toggleReaction: async (messageId: string, userId: string, emoji: string) => {
        // 1. Validate Membership
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: { conversation: true }
        });

        if (!message) throw new Error('Message not found');

        const member = await prisma.conversationMember.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: message.conversationId,
                    userId
                }
            }
        });

        if (!member) throw new Error('User is not a member of this conversation');

        // 2. Transactional Toggle
        return prisma.$transaction(async (tx: any) => {
            const existing = await tx.messageReaction.findUnique({
                where: {
                    messageId_userId: {
                        messageId,
                        userId
                    }
                }
            });

            if (existing) {
                if (existing.emoji === emoji) {
                    // Same emoji -> Remove (Toggle Off)
                    await tx.messageReaction.delete({
                        where: { id: existing.id }
                    });
                    return { action: 'REMOVED', emoji };
                } else {
                    // Different emoji -> Update
                    const updated = await tx.messageReaction.update({
                        where: { id: existing.id },
                        data: { emoji }
                    });
                    return { action: 'UPDATED', reaction: updated };
                }
            } else {
                // New reaction -> Create
                const newReaction = await tx.messageReaction.create({
                    data: {
                        messageId,
                        userId,
                        emoji
                    }
                });

                if (message.senderId !== userId) {
                    import('./notificationService.js').then(({ notificationService }) => {
                        notificationService.createNotification({
                            userId: message.senderId,
                            type: 'REACTION',
                            title: 'New Reaction',
                            body: `Someone reacted with ${emoji} to your message.`,
                            link: `/chat/${message.conversationId}`,
                            metadata: { messageId, reactorId: userId, emoji }
                        });
                    }).catch(console.error);
                }

                return { action: 'CREATED', reaction: newReaction };
            }
        });
    },

    /**
     * Get reactions for a message, aggregated by emoji.
     */
    getReactions: async (messageId: string) => {
        // dynamic aggregation
        const groups = await prisma.messageReaction.groupBy({
            by: ['emoji'],
            where: { messageId },
            _count: {
                _all: true
            }
        });

        return groups.map(g => ({
            emoji: g.emoji,
            count: g._count._all
        }));
    }
};
