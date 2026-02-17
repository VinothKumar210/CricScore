import { prisma } from '../utils/db.js';

export const pollService = {
    /**
     * Create a new poll in a conversation.
     */
    createPoll: async (
        conversationId: string,
        senderId: string,
        question: string,
        options: { id: string; text: string }[],
        expiresAt?: Date,
        isAnonymous: boolean = false
    ) => {
        // 1. Validate Membership
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

        // 2. Create Poll Message
        // We create a message of type 'POLL' (assuming enum support) or generic system message
        // For now, checks schema: ChatPoll is separate but linked to a messageId?
        // Schema says: ChatPoll has messageId field. So we Create Message -> Create Poll.

        return prisma.$transaction(async (tx: any) => {
            const message = await tx.message.create({
                data: {
                    conversationId,
                    senderId,
                    type: 'TEXT', // Placeholder or custom type if 'POLL' exists in enum
                    content: '📊 Poll: ' + question,
                }
            });

            const poll = await tx.chatPoll.create({
                data: {
                    conversationId,
                    messageId: message.id,
                    question,
                    options: options, // Storing only {id, text}
                    expiresAt,
                    isAnonymous
                }
            });

            return { message, poll };
        });
    },

    /**
     * Vote on a poll.
     * Single source of truth: ChatPollVote table.
     * Transactional: Delete old vote -> Insert new vote -> Aggregation.
     */
    votePoll: async (pollId: string, userId: string, optionId: string) => {
        // 1. Validate Poll existence
        const poll = await prisma.chatPoll.findUnique({
            where: { id: pollId }
        });

        if (!poll) throw new Error('Poll not found');

        if (poll.expiresAt && new Date() > poll.expiresAt) {
            throw new Error('Poll has ended');
        }

        // 2. Transactional Vote
        await prisma.$transaction(async (tx: any) => {
            // Remove existing vote by this user for this poll (if any)
            await tx.chatPollVote.deleteMany({
                where: {
                    pollId,
                    userId
                }
            });

            // Insert new vote
            await tx.chatPollVote.create({
                data: {
                    pollId,
                    userId,
                    optionId
                }
            });
        });

        // 3. Return updated poll state (Dynamic Aggregation)
        return pollService.getPoll(pollId);
    },

    /**
     * Get poll details with dynamic vote counts.
     */
    getPoll: async (pollId: string) => {
        const poll = await prisma.chatPoll.findUnique({
            where: { id: pollId }
        });

        if (!poll) return null;

        // Aggregate votes grouped by optionId
        const votes = await prisma.chatPollVote.groupBy({
            by: ['optionId'],
            where: { pollId },
            _count: {
                _all: true
            }
        });

        // Map counts to options
        const options = (poll.options as any[]).map((opt: any) => {
            const voteGroup = votes.find(v => v.optionId === opt.id);
            return {
                ...opt,
                count: voteGroup?._count._all || 0
            };
        });

        // Get user's vote (if not anonymous, or needed for UI state)
        // For anonymous polls, we might hide *who* voted but user needs to know *what* they voted for.

        return {
            ...poll,
            options,
            // We can also fetch recent voters if public
        };
    }
};
