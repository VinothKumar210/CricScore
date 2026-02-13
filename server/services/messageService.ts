import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get or create a DIRECT conversation between two users
 */
export async function getOrCreateDirectConversation(userId1: string, userId2: string) {
    // Look for existing DM between these two users
    const existing = await prisma.conversation.findFirst({
        where: {
            type: 'DIRECT',
            AND: [
                { members: { some: { userId: userId1 } } },
                { members: { some: { userId: userId2 } } }
            ]
        },
        include: {
            members: { include: { user: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } } } },
            messages: { take: 1, orderBy: { createdAt: 'desc' } }
        }
    });

    if (existing) return existing;

    // Create new DM
    const otherUser = await prisma.user.findUnique({ where: { id: userId2 }, select: { profileName: true, username: true } });
    return prisma.conversation.create({
        data: {
            type: 'DIRECT',
            name: null,
            members: {
                create: [
                    { userId: userId1 },
                    { userId: userId2 }
                ]
            }
        },
        include: {
            members: { include: { user: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } } } },
            messages: { take: 1, orderBy: { createdAt: 'desc' } }
        }
    });
}

/**
 * Get or create a TEAM conversation
 */
export async function getOrCreateTeamConversation(teamId: string, teamName: string, teamLogoUrl?: string) {
    const existing = await prisma.conversation.findFirst({
        where: { type: 'TEAM', teamId },
        include: {
            members: { include: { user: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } } } },
            messages: { take: 1, orderBy: { createdAt: 'desc' } }
        }
    });

    if (existing) return existing;

    // Create team chat and add all team members
    const teamMembers = await prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true }
    });

    // Also include the team creator
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { createdById: true } });
    const memberIds = [...new Set([...(team ? [team.createdById] : []), ...teamMembers.map(m => m.userId)])];

    return prisma.conversation.create({
        data: {
            type: 'TEAM',
            teamId,
            name: teamName,
            avatarUrl: teamLogoUrl,
            members: { create: memberIds.map(uid => ({ userId: uid })) }
        },
        include: {
            members: { include: { user: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } } } },
            messages: { take: 1, orderBy: { createdAt: 'desc' } }
        }
    });
}

/**
 * Get or create an INVITE conversation
 */
export async function getOrCreateInviteConversation(inviteId: string, userId: string) {
    const existing = await prisma.conversation.findFirst({
        where: { type: 'INVITE', inviteId },
        include: {
            members: { include: { user: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } } } },
            messages: { take: 1, orderBy: { createdAt: 'desc' } }
        }
    });

    if (existing) {
        // Add user if not already a member
        const isMember = existing.members.some(m => m.userId === userId);
        if (!isMember) {
            await prisma.conversationMember.create({
                data: { conversationId: existing.id, userId }
            });
        }
        return existing;
    }

    // Get invite details
    const invite = await prisma.matchInvite.findUnique({
        where: { id: inviteId },
        include: { team: true, ground: true }
    });

    if (!invite) throw new Error('Invite not found');

    return prisma.conversation.create({
        data: {
            type: 'INVITE',
            inviteId,
            name: `Match: ${invite.team.name} at ${invite.ground.groundName}`,
            members: {
                create: [
                    { userId: invite.createdBy },
                    ...(userId !== invite.createdBy ? [{ userId }] : [])
                ]
            }
        },
        include: {
            members: { include: { user: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } } } },
            messages: { take: 1, orderBy: { createdAt: 'desc' } }
        }
    });
}
