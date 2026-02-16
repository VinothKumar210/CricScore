import { prisma } from '../utils/db.js';
import { generateJoinCode } from '../utils/joinCodeGenerator.js';
import type { Team, TeamMember } from '@prisma/client';

export const teamService = {
    /**
     * Create a new team.
     * Transaction: Creates Team -> Creates Owner Member.
     */
    createTeam: async (userId: string, data: { name: string; city?: string; shortName?: string }) => {
        return prisma.$transaction(async (tx: any) => {
            const joinCode = generateJoinCode();

            const team = await tx.team.create({
                data: {
                    name: data.name,
                    city: data.city,
                    shortName: data.shortName,
                    ownerId: userId,
                    inviteCode: joinCode,
                    matchesConfirmed: 0,
                    matchesCancelled: 0,
                },
            });

            // Add creator as OWNER
            await tx.teamMember.create({
                data: {
                    teamId: team.id,
                    userId: userId,
                    role: 'OWNER',
                },
            });

            return team;
        });
    },

    /**
     * Get team details with members and computed reliability score.
     */
    getTeamDetails: async (teamId: string) => {
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                profilePictureUrl: true,
                                role: true, // Cricket Role (Batsman etc.)
                            },
                        },
                    },
                },
            },
        });

        if (!team) return null;

        // Compute Reliability Score
        let reliability = 100;
        if (team.matchesConfirmed > 0) {
            reliability = ((team.matchesConfirmed - team.matchesCancelled) / team.matchesConfirmed) * 100;
        }

        return { ...team, reliability: Math.round(reliability) };
    },

    /**
     * Delete team (Owner only).
     * Cascading delete handled by Prisma schema if relations configured, otherwise need manual cleanup.
     * Here we rely on explicit deletion or Prisma cascade.
     */
    deleteTeam: async (teamId: string) => {
        // Delete all members first (if no cascade in DB)
        await prisma.teamMember.deleteMany({ where: { teamId } });
        await prisma.team.delete({ where: { id: teamId } });
    },

    /**
     * Update team details.
     */
    updateTeam: async (teamId: string, data: Partial<Team>) => {
        return prisma.team.update({
            where: { id: teamId },
            data,
        });
    },

    /**
     * Join team via code.
     */
    joinTeamByCode: async (userId: string, joinCode: string) => {
        const team = await prisma.team.findUnique({
            where: { inviteCode: joinCode },
        });

        if (!team) {
            throw { statusCode: 404, message: 'Invalid join code', code: 'INVALID_CODE' };
        }

        // Check if already member
        const existing = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: team.id,
                    userId,
                },
            },
        });

        if (existing) {
            throw { statusCode: 409, message: 'Already a member of this team', code: 'ALREADY_MEMBER' };
        }

        return prisma.teamMember.create({
            data: {
                teamId: team.id,
                userId,
                role: 'PLAYER',
            },
        });
    },

    /**
     * Add member directly (by Owner/Captain).
     */
    addMember: async (teamId: string, userId: string, role: string = 'PLAYER') => {
        // Prevent duplicates
        const existing = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
        });

        if (existing) {
            throw { statusCode: 409, message: 'User is already in the team', code: 'ALREADY_MEMBER' };
        }

        return prisma.teamMember.create({
            data: {
                teamId,
                userId,
                role: role as any,
            },
        });
    },

    /**
     * Remove member.
     * Prevent removing the last owner.
     */
    removeMember: async (teamId: string, memberId: string) => {
        const member = await prisma.teamMember.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            throw { statusCode: 404, message: 'Member not found', code: 'MEMBER_NOT_FOUND' };
        }

        if (member.role === 'OWNER') {
            const ownerCount = await prisma.teamMember.count({
                where: { teamId, role: 'OWNER' },
            });

            if (ownerCount <= 1) {
                throw { statusCode: 400, message: 'Cannot remove the last owner', code: 'LAST_OWNER' };
            }
        }

        return prisma.teamMember.delete({
            where: { id: memberId },
        });
    },

    /**
     * Update member role.
     */
    updateMemberRole: async (teamId: string, memberId: string, newRole: string) => {
        return prisma.teamMember.update({
            where: { id: memberId },
            data: { role: newRole as any },
        });
    },
};
