import { prisma } from '../utils/db.js';

export const messageService = {

    /**
     * Validate Room Membership dynamically
     */
    validateRoomMembership: async (userId: string, roomType: 'TEAM' | 'MATCH', roomId: string): Promise<boolean> => {
        if (!userId || !roomId) return false;

        if (roomType === 'TEAM') {
            const member = await prisma.teamMember.findUnique({
                where: {
                    teamId_userId: {
                        teamId: roomId,
                        userId
                    }
                }
            });
            return !!member;
        }

        if (roomType === 'MATCH') {
            const match = await prisma.matchSummary.findUnique({
                where: { id: roomId },
                select: { homeTeamId: true, awayTeamId: true }
            });

            if (!match) return false;

            const validTeamIds = [match.homeTeamId, match.awayTeamId].filter(Boolean) as string[];
            if (validTeamIds.length === 0) return false;

            const member = await prisma.teamMember.findFirst({
                where: {
                    userId,
                    teamId: { in: validTeamIds }
                }
            });

            return !!member;
        }

        return false;
    },

    /**
     * Save Message with Client Nonce Idempotency Guard
     */
    saveRoomMessage: async (
        senderId: string,
        roomType: 'TEAM' | 'MATCH',
        roomId: string,
        content: string,
        clientNonce?: string
    ) => {
        // 1. Validate Membership
        const isMember = await messageService.validateRoomMembership(senderId, roomType, roomId);
        if (!isMember) {
            throw new Error('User is not authorized for this room');
        }

        // 2. Idempotent POST Check via clientNonce
        if (clientNonce) {
            const existing = await prisma.message.findFirst({
                where: {
                    senderId,
                    clientNonce
                } as any,
                include: {
                    sender: { select: { id: true, fullName: true, phoneNumber: true, profilePictureUrl: true } }
                }
            });

            if (existing) {
                return existing; // Double-submit guarded natively
            }
        }

        // 3. Persist natively bypassing in-memory race risks
        const message = await prisma.message.create({
            data: {
                roomType,
                roomId,
                senderId,
                content,
                clientNonce: clientNonce ?? null
            } as any,
            include: {
                sender: { select: { id: true, fullName: true, phoneNumber: true, profilePictureUrl: true } }
            }
        });

        return message;
    },

    /**
     * Fetch Room History via Dual Pagination (Cursor or After Timestamp)
     */
    getRoomHistory: async (
        roomType: 'TEAM' | 'MATCH',
        roomId: string,
        limit = 50,
        cursor?: string,
        after?: string
    ) => {
        const whereClause: any = {
            roomType,
            roomId
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
                sender: { select: { id: true, fullName: true, phoneNumber: true, profilePictureUrl: true } }
            }
        });
    }

};

