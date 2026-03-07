import { api } from '../../lib/api';

export interface PostAuthor {
    id: string;
    fullName: string;
    username: string | null;
    profilePictureUrl: string | null;
}

export interface PostReaction {
    type: 'LIKE' | 'SIX' | 'FIRE' | 'CLAP' | 'BEAST' | 'HUNDRED';
}

export interface PostType {
    id: string;
    authorId: string;
    type: 'AUTO_MILESTONE' | 'MATCH_SHARE' | 'TEXT' | 'PHOTO';
    eventType?: string | null;
    matchId?: string | null;
    content?: string | null;
    mediaUrls: string[];
    visibility: 'PUBLIC' | 'FOLLOWERS_ONLY';
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    author: PostAuthor;
    userReaction?: string | null; // The logged-in user's reaction if any
}

export interface PostCommentType {
    id: string;
    postId: string;
    userId: string;
    content: string;
    createdAt: string;
    user: PostAuthor;
}

export interface FollowRequest {
    id: string;
    followerId: string;
    followingId: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
    follower: PostAuthor;
}

export const socialService = {
    // -------------------------------------------------------------------------
    // Feed & Posts
    // -------------------------------------------------------------------------

    getFeed: async (cursor?: string): Promise<{ posts: PostType[], nextCursor: string | null }> => {
        const { data } = await api.get('/api/posts/feed', { params: { cursor } });
        return data.data || data;
    },

    getUserPosts: async (targetId: string, cursor?: string): Promise<{ posts: PostType[], nextCursor: string | null }> => {
        const { data } = await api.get(`/api/posts/user/${targetId}`, { params: { cursor } });
        return data.data || data;
    },

    createPost: async (content: string, mediaUrls: string[] = [], visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' = 'PUBLIC'): Promise<PostType> => {
        const { data } = await api.post('/api/posts', { content, mediaUrls, visibility });
        return data.data?.post || data.post;
    },

    deletePost: async (postId: string) => {
        const { data } = await api.delete(`/api/posts/${postId}`);
        return data.data || data;
    },

    // -------------------------------------------------------------------------
    // Reactions & Comments
    // -------------------------------------------------------------------------

    reactToPost: async (postId: string, type: 'LIKE' | 'SIX' | 'FIRE' | 'CLAP' | 'BEAST' | 'HUNDRED') => {
        const { data } = await api.post(`/api/posts/${postId}/react`, { type });
        return data.data || data;
    },

    removeReaction: async (postId: string) => {
        const { data } = await api.delete(`/api/posts/${postId}/react`);
        return data.data || data;
    },

    getComments: async (postId: string, cursor?: string): Promise<{ comments: PostCommentType[], nextCursor: string | null }> => {
        const { data } = await api.get(`/api/posts/${postId}/comments`, { params: { cursor } });
        return data.data || data;
    },

    addComment: async (postId: string, content: string): Promise<PostCommentType> => {
        const { data } = await api.post(`/api/posts/${postId}/comments`, { content });
        return data.data?.comment || data.comment;
    },

    deleteComment: async (postId: string, commentId: string) => {
        const { data } = await api.delete(`/api/posts/${postId}/comments/${commentId}`);
        return data.data || data;
    },

    // -------------------------------------------------------------------------
    // Following & Followers
    // -------------------------------------------------------------------------

    followUser: async (targetId: string) => {
        const { data } = await api.post(`/api/follows/${targetId}`);
        return data.data || data;
    },

    unfollowUser: async (targetId: string) => {
        const { data } = await api.delete(`/api/follows/${targetId}`);
        return data.data || data;
    },

    getFollowRequests: async (): Promise<{ requests: FollowRequest[] }> => {
        const { data } = await api.get('/api/follows/requests');
        return data.data || data;
    },

    respondToFollowRequest: async (followerId: string, accept: boolean) => {
        const { data } = await api.post(`/api/follows/requests/${followerId}`, { accept });
        return data.data || data;
    },

    getFollowers: async (userId: string) => {
        const { data } = await api.get(`/api/follows/${userId}/followers`);
        return data.data?.followers || [];
    },

    getFollowing: async (userId: string) => {
        const { data } = await api.get(`/api/follows/${userId}/following`);
        return data.data?.following || [];
    }
};
