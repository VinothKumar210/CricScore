import { prisma } from '../utils/db.js';

export const postService = {
    /**
     * Create a user-generated post
     */
    createPost: async (authorId: string, content: string, mediaUrls: string[] = [], visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' = 'PUBLIC') => {
        const post = await prisma.post.create({
            data: {
                authorId,
                type: mediaUrls.length > 0 ? 'PHOTO' : 'TEXT',
                content,
                mediaUrls,
                visibility
            },
            include: {
                author: { select: { id: true, fullName: true, username: true, profilePictureUrl: true } }
            }
        });
        return post;
    },

    /**
     * Delete a post
     */
    deletePost: async (postId: string, userId: string) => {
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) throw { statusCode: 404, message: 'Post not found' };
        if (post.authorId !== userId) throw { statusCode: 403, message: 'Not authorized to delete this post' };

        await prisma.post.delete({ where: { id: postId } });
        return { message: 'Post deleted successfully' };
    },

    /**
     * Generate an automated milestone post (e.g., Century, 5-Wicket Haul)
     */
    createMilestonePost: async (
        authorId: string,
        matchId: string,
        eventType: 'CENTURY' | 'FIFTY' | 'FIVE_WICKET' | 'HAT_TRICK' | 'MATCH_WIN',
        content: string
    ) => {
        // Prevent duplicate milestone posts for the same match and user
        const existing = await prisma.post.findFirst({
            where: {
                authorId,
                matchId,
                eventType,
                type: 'AUTO_MILESTONE'
            }
        });

        if (existing) return existing;

        const post = await prisma.post.create({
            data: {
                authorId,
                type: 'AUTO_MILESTONE',
                eventType,
                matchId,
                content,
                visibility: 'PUBLIC'
            }
        });

        return post;
    },

    /**
     * Fetch a user's personalised feed (Own posts + Following posts)
     */
    getFeed: async (userId: string, cursor?: string, limit: number = 20) => {
        // Find users the current user follows
        const following = await prisma.follow.findMany({
            where: { followerId: userId, status: 'ACCEPTED' },
            select: { followingId: true }
        });
        const followingIds = following.map(f => f.followingId);

        // Include the user's own posts
        const authorIds = [userId, ...followingIds];

        const query: any = {
            where: {
                authorId: { in: authorIds },
                isDraft: false,
                // If following, they can see PUBLIC and FOLLOWERS_ONLY posts.
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1, // +1 to check if there is a next page
            include: {
                author: { select: { id: true, fullName: true, username: true, profilePictureUrl: true } },
                _count: {
                    select: { comments: true, reactions: true }
                }
            }
        };

        if (cursor) {
            query.cursor = { id: cursor };
            query.skip = 1; // Skip the cursor itself
        }

        const posts = await prisma.post.findMany(query);

        let nextCursor: string | null = null;
        if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem!.id;
        }

        // Check if the current user has liked these posts
        const postIds = posts.map((p: any) => p.id);
        const userReactions = await prisma.postReaction.findMany({
            where: {
                userId,
                postId: { in: postIds }
            }
        });

        const reactionMap = new Map();
        userReactions.forEach(r => reactionMap.set(r.postId, r.type));

        const mappedPosts = posts.map((p: any) => ({
            ...p,
            userReaction: reactionMap.get(p.id) || null
        }));

        return {
            posts: mappedPosts,
            nextCursor
        };
    },

    /**
     * Fetch a specific user's public profile posts
     */
    getUserPosts: async (viewerId: string, targetUserId: string, cursor?: string, limit: number = 20) => {
        // Determine if target is followed by viewer to show FOLLOWERS_ONLY
        const isFollowing = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } }
        });

        const canSeePrivate = viewerId === targetUserId || isFollowing?.status === 'ACCEPTED';

        const query: any = {
            where: {
                authorId: targetUserId,
                isDraft: false,
                visibility: canSeePrivate ? undefined : 'PUBLIC'
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            include: {
                author: { select: { id: true, fullName: true, username: true, profilePictureUrl: true } },
                _count: { select: { comments: true, reactions: true } }
            }
        };

        if (cursor) {
            query.cursor = { id: cursor };
            query.skip = 1;
        }

        const posts = await prisma.post.findMany(query);

        let nextCursor: string | null = null;
        if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem!.id;
        }

        // Attach viewer's reaction status
        const postIds = posts.map((p: any) => p.id);
        const userReactions = await prisma.postReaction.findMany({
            where: { userId: viewerId, postId: { in: postIds } }
        });

        const reactionMap = new Map();
        userReactions.forEach(r => reactionMap.set(r.postId, r.type));

        const mappedPosts = posts.map((p: any) => ({
            ...p,
            userReaction: reactionMap.get(p.id) || null
        }));

        return {
            posts: mappedPosts,
            nextCursor
        };
    }
};
