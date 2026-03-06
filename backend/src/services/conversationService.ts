import { prisma } from '../utils/db.js';

export const conversationService = {

    /**
     * Finds an existing DIRECT conversation between two users or creates a new one.
     */
    findOrCreateDirect: async (userIdA: string, userIdB: string) => {
        // Enforce consistent ordering to easily find existing DMs without complex queries
        const [u1, u2] = [userIdA, userIdB].sort();

        // Unique name key for DIRECT chats to prevent duplicates
        const directUniqueName = `direct:${u1}:${u2}`;

        // Try to find existing first
        const existing = await prisma.conversation.findFirst({
            where: {
                type: 'DIRECT',
                name: directUniqueName
            },
            include: {
                members: {
                    include: { user: { select: { id: true, fullName: true, profilePictureUrl: true } } }
                }
            }
        });

        if (existing) return existing;

        // Create new
        return prisma.conversation.create({
            data: {
                type: 'DIRECT',
                name: directUniqueName, // Internal unique identifier for DIRECTs
                members: {
                    create: [
                        { userId: u1 as string, role: 'ADMIN' },
                        { userId: u2 as string, role: 'ADMIN' }
                    ]
                }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, fullName: true, profilePictureUrl: true } } }
                }
            }
        });
    },

    /**
     * Auto-called when a team is created. Creates the main TEAM chat.
     */
    createTeamConversation: async (teamId: string, teamName: string, ownerId: string) => {
        return prisma.conversation.create({
            data: {
                type: 'TEAM',
                entityId: teamId,
                name: `${teamName} (Main Chat)`,
                members: {
                    create: [
                        { userId: ownerId, role: 'ADMIN' }
                    ]
                }
            }
        });
    },

    /**
     * Called when a user joins a team via invite code. Adds them to all non-subgroup TEAM conversations.
     */
    addMemberToTeamConversations: async (teamId: string, userId: string, role: string = 'MEMBER') => {
        // Find the main team conversation (has type TEAM and entityId = teamId)
        const teamConv = await prisma.conversation.findFirst({
            where: {
                type: 'TEAM',
                entityId: teamId
            }
        });

        if (teamConv) {
            // Upsert to handle edge cases where member might already exist
            await prisma.conversationMember.upsert({
                where: {
                    conversationId_userId: {
                        conversationId: teamConv.id,
                        userId
                    }
                },
                create: {
                    conversationId: teamConv.id,
                    userId,
                    role: role === 'OWNER' || role === 'CAPTAIN' ? 'ADMIN' : 'MEMBER'
                },
                update: {
                    role: role === 'OWNER' || role === 'CAPTAIN' ? 'ADMIN' : 'MEMBER'
                }
            });
        }
    },

    /**
     * Called when a user leaves or is kicked from a team. Removes them from ALL team conversations (including sub-groups).
     */
    removeMemberFromTeamConversations: async (teamId: string, userId: string) => {
        // Find all conversations linked to this team (Main + Subgroups)
        const teamConvs = await prisma.conversation.findMany({
            where: {
                OR: [
                    { type: 'TEAM', entityId: teamId },
                    { type: 'GROUP', entityId: teamId } // Sub-groups belong to the team
                ]
            },
            select: { id: true }
        });

        const convIds = teamConvs.map(c => c.id);

        if (convIds.length > 0) {
            await prisma.conversationMember.deleteMany({
                where: {
                    userId,
                    conversationId: { in: convIds }
                }
            });
        }
    },

    /**
     * Create a custom sub-group within a team.
     */
    createSubGroup: async (name: string, teamId: string, creatorId: string, additionalMemberIds: string[] = []) => {
        // Ensure unique members including creator
        const memberIds = Array.from(new Set([creatorId, ...additionalMemberIds]));

        return prisma.conversation.create({
            data: {
                type: 'GROUP',
                entityId: teamId, // Link to team
                name,
                members: {
                    create: memberIds.map(uid => ({
                        userId: uid,
                        role: uid === creatorId ? 'ADMIN' : 'MEMBER'
                    }))
                }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, fullName: true, profilePictureUrl: true } } }
                }
            }
        });
    },

    /**
     * Get a user's conversations with optional type filtering.
     * Replaces the old inbox logic to pull directly from the relational models.
     */
    getUserConversations: async (userId: string, type?: 'DIRECT' | 'GROUP' | 'TEAM' | 'MATCH') => {
        const whereClause: any = {
            members: { some: { userId } },
            isArchived: false
        };

        if (type) {
            whereClause.type = type;
        }

        return prisma.conversation.findMany({
            where: whereClause,
            include: {
                // Include the last message for previews
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        sender: { select: { id: true, fullName: true } }
                    }
                },
                // Include members so we can compute names for DMs
                members: {
                    include: {
                        user: { select: { id: true, fullName: true, profilePictureUrl: true } }
                    }
                }
            },
            orderBy: {
                lastMessageAt: 'desc' // Sort by most recent activity
            }
        });
    },

    /**
     * Archive a match conversation. Called automatically when a match is finalized.
     */
    archiveMatchConversation: async (matchId: string) => {
        // Find the MATCH conversation associated with this matchId
        const matchConv = await prisma.conversation.findFirst({
            where: {
                type: 'MATCH',
                entityId: matchId
            }
        });

        if (matchConv) {
            await prisma.conversation.update({
                where: { id: matchConv.id },
                data: { isArchived: true }
            });
        }
    }
};
