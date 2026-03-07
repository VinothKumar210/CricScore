import { prisma } from '../utils/db.js';
import { notificationService } from './notificationService.js';

export const reactionService = {
    /**
     * Add or update a reaction on a post
     */
    reactToPost: async (userId: string, postId: string, type: string) => {
        // Enforce valid enum values roughly
        const validTypes = ['LIKE', 'SIX', 'FIRE', 'CLAP', 'BEAST', 'HUNDRED'];
        if (!validTypes.includes(type)) throw { statusCode: 400, message: 'Invalid reaction type' };

        // Check post
        const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
        if (!post) throw { statusCode: 404, message: 'Post not found' };

        // Upsert reaction
        const reaction = await prisma.postReaction.upsert({
            where: {
                postId_userId: {
                    postId,
                    userId
                }
            },
            update: { type: type as any },
            create: {
                postId,
                userId,
                type: type as any
            }
        });

        // Update post metrics aggregate (Ideally done via triggers, but we can do it manually or via count)
        // A simple increment might be flaky if upsert updated. We can just count.
        const likesCount = await prisma.postReaction.count({ where: { postId } });
        await prisma.post.update({ where: { id: postId }, data: { likesCount } });

        // Notify poster if it's a new interaction and not self
        if (post.authorId !== userId) {
            const reactor = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
            await notificationService.createNotification({
                userId: post.authorId,
                type: 'REACTION',
                title: 'New Reaction',
                body: `${reactor?.fullName} reacted to your post.`,
                link: `/post/${postId}` // Example deep link
            }).catch(console.error);
        }

        return { message: 'Reaction saved', reaction, likesCount };
    },

    /**
     * Remove a reaction from a post
     */
    removeReaction: async (userId: string, postId: string) => {
        const existing = await prisma.postReaction.findUnique({
            where: { postId_userId: { postId, userId } }
        });

        if (!existing) return { message: 'No reaction to remove' };

        await prisma.postReaction.delete({
            where: { id: existing.id }
        });

        const likesCount = await prisma.postReaction.count({ where: { postId } });
        await prisma.post.update({ where: { id: postId }, data: { likesCount } });

        return { message: 'Reaction removed', likesCount };
    },

    /**
     * Comment on a post
     */
    addComment: async (userId: string, postId: string, content: string) => {
        const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
        if (!post) throw { statusCode: 404, message: 'Post not found' };

        const comment = await prisma.postComment.create({
            data: {
                postId,
                userId,
                content
            },
            include: {
                user: { select: { id: true, fullName: true, username: true, profilePictureUrl: true } }
            }
        });

        const commentsCount = await prisma.postComment.count({ where: { postId } });
        await prisma.post.update({ where: { id: postId }, data: { commentsCount } });

        // Notify poster
        if (post.authorId !== userId) {
            const commenter = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
            await notificationService.createNotification({
                userId: post.authorId,
                type: 'REACTION',
                title: 'New Comment',
                body: `${commenter?.fullName} commented on your post: "${content.substring(0, 30)}..."`,
                link: `/post/${postId}`
            }).catch(console.error);
        }

        return { message: 'Comment added', comment, commentsCount };
    },

    /**
     * Delete a comment
     */
    deleteComment: async (userId: string, commentId: string) => {
        const comment = await prisma.postComment.findUnique({
            where: { id: commentId },
            include: { post: { select: { authorId: true } } }
        });

        if (!comment) throw { statusCode: 404, message: 'Comment not found' };

        // Allow deletion if you are the comment author OR the post author
        if (comment.userId !== userId && comment.post.authorId !== userId) {
            throw { statusCode: 403, message: 'Not authorized to delete this comment' };
        }

        await prisma.postComment.delete({ where: { id: commentId } });

        const commentsCount = await prisma.postComment.count({ where: { postId: comment.postId } });
        await prisma.post.update({ where: { id: comment.postId }, data: { commentsCount } });

        return { message: 'Comment deleted', commentsCount };
    },

    /**
     * Get comments for a post
     */
    getComments: async (postId: string, cursor?: string, limit: number = 20) => {
        const query: any = {
            where: { postId },
            orderBy: { createdAt: 'desc' }, // Latest first
            take: limit + 1,
            include: {
                user: { select: { id: true, fullName: true, username: true, profilePictureUrl: true } }
            }
        };

        if (cursor) {
            query.cursor = { id: cursor };
            query.skip = 1;
        }

        const comments = await prisma.postComment.findMany(query);

        let nextCursor: string | null = null;
        if (comments.length > limit) {
            const nextItem = comments.pop();
            nextCursor = nextItem!.id;
        }

        return { comments, nextCursor };
    }
};
