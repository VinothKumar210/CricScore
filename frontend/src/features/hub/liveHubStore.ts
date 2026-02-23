/**
 * liveHubStore.ts — Isolated Zustand store for Live Hub
 *
 * Rules:
 * - Never creates a derived bundle
 * - Never mutates scoringStore
 * - Polling-based (10s interval)
 * - Pauses polling when tab is hidden
 */

import { create } from 'zustand';
import { fetchHubFeed } from './liveHubService';
import type { HubMatchItem } from './types';

interface LiveHubState {
    // Data
    yourMatches: HubMatchItem[];
    liveMatches: HubMatchItem[];
    recentCompleted: HubMatchItem[];
    liveCount: number;

    // UI
    isLoading: boolean;
    error: string | null;
    lastFetchedAt: number | null;

    // Actions
    fetchFeed: () => Promise<void>;
    startPolling: () => () => void;
    reset: () => void;
}

const POLL_INTERVAL_MS = 10_000;

export const useLiveHubStore = create<LiveHubState>((set, get) => ({
    // Initial state
    yourMatches: [],
    liveMatches: [],
    recentCompleted: [],
    liveCount: 0,
    isLoading: false,
    error: null,
    lastFetchedAt: null,

    fetchFeed: async () => {
        // Skip if already loading
        if (get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
            const feed = await fetchHubFeed();

            set({
                yourMatches: feed.yourMatches,
                liveMatches: feed.liveMatches,
                recentCompleted: feed.recentCompleted,
                liveCount: feed.liveCount,
                isLoading: false,
                lastFetchedAt: Date.now(),
            });
        } catch (err: any) {
            set({
                error: err?.message || 'Failed to load hub feed',
                isLoading: false,
            });
        }
    },

    /**
     * Start polling. Returns cleanup function.
     * Pauses when tab is hidden (visibilitychange).
     */
    startPolling: () => {
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const start = () => {
            if (intervalId) return; // Already running
            intervalId = setInterval(() => {
                get().fetchFeed();
            }, POLL_INTERVAL_MS);
        };

        const stop = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const handleVisibility = () => {
            if (document.hidden) {
                stop();
            } else {
                // Resume: immediate fetch + restart interval
                get().fetchFeed();
                start();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        start();

        // Return cleanup
        return () => {
            stop();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    },

    reset: () => {
        set({
            yourMatches: [],
            liveMatches: [],
            recentCompleted: [],
            liveCount: 0,
            isLoading: false,
            error: null,
            lastFetchedAt: null,
        });
    },
}));
