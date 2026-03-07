import { prisma } from '../utils/db.js';
import { notificationService } from './notificationService.js';

export const followService = {
    /**
     * Follow a user.
     * If public, creates an ACCEPTED follow.
     * If private, creates a PENDING follow.
     */
    followUser: async (followerId: string, followingId: string) => {
        if (followerId === followingId) {
            throw { statusCode: 400, message: "You cannot follow yourself." };
        }

        // Check if target user exists and check their privacy setting
        const targetUser = await prisma.user.findUnique({
            where: { id: followingId },
            select: { id: true, isPrivate: true, fullName: true }
        });

        if (!targetUser) {
            throw { statusCode: 404, message: "User not found." };
        }

        // Check if follow already exists
        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId
                }
            }
        });

        if (existingFollow) {
            return { message: `You already have a ${existingFollow.status.toLowerCase()} follow request for this user.`, follow: existingFollow };
        }

        const initialStatus = targetUser.isPrivate ? 'PENDING' : 'ACCEPTED';

        // Create the Follow record
        const follow = await prisma.follow.create({
            data: {
                followerId,
                followingId,
                status: initialStatus
            }
        });

        // Trigger notification
        try {
            const follower = await prisma.user.findUnique({ where: { id: followerId }, select: { fullName: true } });

            if (initialStatus === 'PENDING') {
                await notificationService.createNotification({
                    userId: followingId,
                    type: 'MENTION', // We can repurpose mention or use a specific type if defined
                    title: 'New Follow Request',
                    body: `${follower?.fullName} requested to follow you.`,
                    link: '/profile/requests' // Example link
                });
            } else {
                await notificationService.createNotification({
                    userId: followingId,
                    type: 'MENTION',
                    title: 'New Follower',
                    body: `${follower?.fullName} started following you.`,
                    link: `/profile/${followerId}`
                });
            }
        } catch (error) {
            console.error('[FollowService] Failed to send notification', error);
        }

        return {
            message: initialStatus === 'PENDING' ? 'Follow request sent.' : 'Successfully followed user.',
            follow
        };
    },

    /**
     * Respond to a Pending Follow Request
     */
    respondToRequest: async (userId: string, followerId: string, accept: boolean) => {
        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId: userId
                }
            }
        });

        if (!existingFollow) {
            throw { statusCode: 404, message: "Follow request not found." };
        }

        if (existingFollow.status !== 'PENDING') {
            throw { statusCode: 400, message: `Request is already ${existingFollow.status}` };
        }

        if (accept) {
            const follow = await prisma.follow.update({
                where: { id: existingFollow.id },
                data: { status: 'ACCEPTED' }
            });

            // Notify follower that their request was accepted
            try {
                const acceptingUser = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
                await notificationService.createNotification({
                    userId: followerId,
                    type: 'MENTION',
                    title: 'Follow Request Accepted',
                    body: `${acceptingUser?.fullName} accepted your follow request.`,
                    link: `/profile/${userId}`
                });
            } catch (error) { }

            return { message: "Follow request accepted.", follow };
        } else {
            await prisma.follow.delete({
                where: { id: existingFollow.id }
            });
            return { message: "Follow request rejected and removed." };
        }
    },

    /**
     * Unfollow a user or cancel a pending request
     */
    unfollowUser: async (followerId: string, followingId: string) => {
        await prisma.follow.deleteMany({
            where: {
                followerId,
                followingId
            }
        });

        return { message: "Successfully unfollowed user." };
    },

    /**
     * Get users following the given user
     */
    getFollowers: async (userId: string) => {
        return prisma.follow.findMany({
            where: {
                followingId: userId,
                status: 'ACCEPTED'
            },
            include: {
                follower: { select: { id: true, fullName: true, username: true, profilePictureUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    /**
     * Get users the given user is following
     */
    getFollowing: async (userId: string) => {
        return prisma.follow.findMany({
            where: {
                followerId: userId,
                status: 'ACCEPTED'
            },
            include: {
                following: { select: { id: true, fullName: true, username: true, profilePictureUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    /**
     * Get pending follow requests for the given user (who has a private profile)
     */
    getFollowRequests: async (userId: string) => {
        return prisma.follow.findMany({
            where: {
                followingId: userId,
                status: 'PENDING'
            },
            include: {
                follower: { select: { id: true, fullName: true, username: true, profilePictureUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
};
