import { create } from 'zustand';
import {
    fetchPlayerStats,
    fetchPlayerForm,
    fetchCompetitiveProfile,
    fetchImpactLeaderboard,
    fetchPublicProfile as fetchPublicProfileAPI,
    updateProfile as updateProfileAPI,
} from './profileService';
import type {
    UserProfile,
    CareerStats,
    FormEntry,
    CompetitiveProfile,
    LeaderboardResponse,
    PublicProfileResponse,
} from './profileService';

interface ProfileState {
    // Profile
    profile: UserProfile | null;
    isProfileLoading: boolean;
    profileError: string | null;

    // Stats
    stats: CareerStats | null;
    isStatsLoading: boolean;
    statsError: string | null;

    // Form
    form: FormEntry[];
    isFormLoading: boolean;

    // Competitive (Phase 12A+)
    competitive: CompetitiveProfile | null;
    isCompetitiveLoading: boolean;

    // Leaderboard (Phase 12A+)
    leaderboard: LeaderboardResponse | null;
    isLeaderboardLoading: boolean;
    leaderboardCachedAt: number;

    // Public Profile (Phase 12A+)
    publicProfile: PublicProfileResponse | null;
    isPublicLoading: boolean;
    publicError: string | null;

    // Actions
    setProfile: (profile: UserProfile) => void;
    fetchStats: (userId: string) => Promise<void>;
    fetchForm: (userId: string) => Promise<void>;
    fetchCompetitive: (userId: string) => Promise<void>;
    fetchLeaderboard: (page?: number, limit?: number) => Promise<void>;
    fetchPublicProfile: (username: string) => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    reset: () => void;
    resetPublic: () => void;
}

const LEADERBOARD_CACHE_MS = 30_000; // 30 seconds

export const useProfileStore = create<ProfileState>((set, get) => ({
    profile: null,
    isProfileLoading: false,
    profileError: null,
    stats: null,
    isStatsLoading: false,
    statsError: null,
    form: [],
    isFormLoading: false,
    competitive: null,
    isCompetitiveLoading: false,
    leaderboard: null,
    isLeaderboardLoading: false,
    leaderboardCachedAt: 0,
    publicProfile: null,
    isPublicLoading: false,
    publicError: null,

    setProfile: (profile) => set({ profile }),

    fetchStats: async (userId: string) => {
        set({ isStatsLoading: true, statsError: null });
        try {
            const stats = await fetchPlayerStats(userId);
            set({ stats, isStatsLoading: false });
        } catch (err: any) {
            set({ statsError: err?.message || 'Failed to load stats', isStatsLoading: false });
        }
    },

    fetchForm: async (userId: string) => {
        set({ isFormLoading: true });
        try {
            const form = await fetchPlayerForm(userId);
            set({ form, isFormLoading: false });
        } catch {
            set({ form: [], isFormLoading: false });
        }
    },

    fetchCompetitive: async (userId: string) => {
        set({ isCompetitiveLoading: true });
        try {
            const competitive = await fetchCompetitiveProfile(userId);
            set({ competitive, isCompetitiveLoading: false });
        } catch {
            set({ isCompetitiveLoading: false });
        }
    },

    fetchLeaderboard: async (page = 1, limit = 20) => {
        // 30s client-side cache
        const now = Date.now();
        const { leaderboardCachedAt, leaderboard } = get();
        if (leaderboard && now - leaderboardCachedAt < LEADERBOARD_CACHE_MS) return;

        set({ isLeaderboardLoading: true });
        try {
            const lb = await fetchImpactLeaderboard(page, limit);
            set({ leaderboard: lb, isLeaderboardLoading: false, leaderboardCachedAt: now });
        } catch {
            set({ isLeaderboardLoading: false });
        }
    },

    fetchPublicProfile: async (username: string) => {
        set({ isPublicLoading: true, publicError: null, publicProfile: null });
        try {
            const result = await fetchPublicProfileAPI(username);
            if (!result) {
                set({ publicError: 'Profile not found', isPublicLoading: false });
                return;
            }
            set({ publicProfile: result, isPublicLoading: false });
        } catch (err: any) {
            set({ publicError: err?.message || 'Failed to load profile', isPublicLoading: false });
        }
    },

    updateProfile: async (data: Partial<UserProfile>) => {
        const updated = await updateProfileAPI(data);
        set({ profile: updated });
    },

    reset: () => set({
        profile: null,
        isProfileLoading: false,
        profileError: null,
        stats: null,
        isStatsLoading: false,
        statsError: null,
        form: [],
        isFormLoading: false,
        competitive: null,
        isCompetitiveLoading: false,
        leaderboard: null,
        isLeaderboardLoading: false,
        leaderboardCachedAt: 0,
        publicProfile: null,
        isPublicLoading: false,
        publicError: null,
    }),

    resetPublic: () => set({
        publicProfile: null,
        isPublicLoading: false,
        publicError: null,
    }),
}));
