/**
 * shareStore.ts — Isolated Zustand store for Public Share Pages
 *
 * Rules:
 * - Never mutates scoringStore
 * - Bundle only created for COMPLETED/ABANDONED matches
 * - No WebSocket connection
 * - reset() MUST be called on unmount
 */

import { create } from 'zustand';
import { fetchShareMatch, fetchShareEvents } from './shareService';
import type { ScrubbedMatch, ShareEvent, ShareMatchConfig } from './types';

interface ShareState {
    // Data
    matchData: ScrubbedMatch | null;
    events: ShareEvent[] | null;
    matchConfig: ShareMatchConfig | null;

    // UI
    isLoading: boolean;
    isEventsLoading: boolean;
    isRateLimited: boolean;
    error: string | null;
    httpStatus: number | null;

    // Actions
    fetchMatch: (matchId: string) => Promise<void>;
    fetchEvents: (matchId: string) => Promise<void>;
    reset: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
    matchData: null,
    events: null,
    matchConfig: null,
    isLoading: false,
    isEventsLoading: false,
    isRateLimited: false,
    error: null,
    httpStatus: null,

    fetchMatch: async (matchId: string) => {
        set({ isLoading: true, error: null, httpStatus: null });

        try {
            const { data, httpStatus } = await fetchShareMatch(matchId);
            set({
                matchData: data,
                httpStatus,
                isLoading: false,
            });
        } catch (err: any) {
            const msg = err?.message || 'Failed to load match';
            set({
                error: msg,
                isLoading: false,
                isRateLimited: msg.includes('Rate limited'),
            });
        }
    },

    fetchEvents: async (matchId: string) => {
        set({ isEventsLoading: true });

        try {
            const { data, httpStatus } = await fetchShareEvents(matchId);

            if (httpStatus === 403 || !data) {
                // Events restricted (LIVE match) — this is expected
                set({ isEventsLoading: false });
                return;
            }

            set({
                events: data.events,
                matchConfig: data.matchConfig,
                isEventsLoading: false,
            });
        } catch (err: any) {
            const msg = err?.message || 'Failed to load events';
            set({
                error: msg,
                isEventsLoading: false,
                isRateLimited: msg.includes('Rate limited'),
            });
        }
    },

    reset: () => {
        set({
            matchData: null,
            events: null,
            matchConfig: null,
            isLoading: false,
            isEventsLoading: false,
            isRateLimited: false,
            error: null,
            httpStatus: null,
        });
    },
}));
