/**
 * archiveStore.ts — Zustand store for Archive System
 *
 * Refinements (per user audit):
 * 1. Split reset: resetDetail() + resetList() — independent cleanup
 * 2. requestId guard in fetchList() — prevents stale pagination responses
 * 3. accessedAt persisted in IndexedDB (handled by archiveCache)
 *
 * Rules:
 * - List view: metadata only, no events, no bundle
 * - Detail view: full events, bundle created via createDerivedBundle
 * - No scoringStore mutation
 */

import { create } from 'zustand';
import { fetchArchiveList, fetchArchiveDetail } from './archiveService';
import { getFromCache, putInCache } from './archiveCache';
import type {
    ArchivedMatchMeta,
    ArchivedMatchFull,
    ArchivePagination,
    ArchiveFiltersState,
} from './types';

interface ArchiveState {
    // List (metadata only — NO events, NO bundle)
    archives: ArchivedMatchMeta[];
    pagination: ArchivePagination;

    // Detail (full events + bundle via createDerivedBundle in component)
    activeArchive: ArchivedMatchFull | null;

    // UI
    isListLoading: boolean;
    isDetailLoading: boolean;
    listError: string | null;
    detailError: string | null;
    filters: ArchiveFiltersState;

    // Internal — requestId guard for preventing stale list responses
    _listRequestId: number;

    // Actions
    fetchList: (page?: number) => Promise<void>;
    fetchDetail: (archiveId: string) => Promise<void>;
    setFilters: (f: Partial<ArchiveFiltersState>) => void;
    resetDetail: () => void;
    resetList: () => void;
}

const INITIAL_PAGINATION: ArchivePagination = {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
};

export const useArchiveStore = create<ArchiveState>((set, get) => ({
    // Initial state
    archives: [],
    pagination: { ...INITIAL_PAGINATION },
    activeArchive: null,
    isListLoading: false,
    isDetailLoading: false,
    listError: null,
    detailError: null,
    filters: {},
    _listRequestId: 0,

    /**
     * Fetch paginated archive list.
     * Uses requestId guard: if a newer request starts before this one finishes,
     * the stale response is discarded.
     */
    fetchList: async (page: number = 1) => {
        const requestId = get()._listRequestId + 1;
        set({ isListLoading: true, listError: null, _listRequestId: requestId });

        try {
            const { filters } = get();
            const result = await fetchArchiveList(page, 20, filters);

            // Guard: discard if a newer request has started
            if (get()._listRequestId !== requestId) return;

            set({
                archives: result.archives,
                pagination: result.pagination,
                isListLoading: false,
            });
        } catch (err: any) {
            // Guard: discard stale error too
            if (get()._listRequestId !== requestId) return;

            set({
                listError: err?.message || 'Failed to load archives',
                isListLoading: false,
            });
        }
    },

    /**
     * Fetch full archive detail.
     * Flow: IndexedDB check → API fallback → cache store → set state.
     */
    fetchDetail: async (archiveId: string) => {
        set({ isDetailLoading: true, detailError: null, activeArchive: null });

        try {
            // 1. Check IndexedDB cache (accessedAt persisted on hit)
            const cached = await getFromCache(archiveId);
            if (cached) {
                set({
                    activeArchive: cached,
                    isDetailLoading: false,
                });
                return;
            }

            // 2. API fallback
            const data = await fetchArchiveDetail(archiveId);

            // 3. Store in IndexedDB (evicts LRU if >20)
            await putInCache(archiveId, data);

            set({
                activeArchive: data,
                isDetailLoading: false,
            });
        } catch (err: any) {
            set({
                detailError: err?.message || 'Failed to load archive',
                isDetailLoading: false,
            });
        }
    },

    /**
     * Update filters and re-fetch list from page 1.
     */
    setFilters: (f: Partial<ArchiveFiltersState>) => {
        set((state) => ({
            filters: { ...state.filters, ...f },
        }));
        get().fetchList(1);
    },

    /**
     * Reset ONLY detail state (bundle cleanup on unmount from /archive/:id).
     * Does NOT touch list state — preserves scroll position if user navigates back.
     */
    resetDetail: () => {
        set({
            activeArchive: null,
            isDetailLoading: false,
            detailError: null,
        });
    },

    /**
     * Reset ONLY list state (cleanup on unmount from /archive).
     * Does NOT touch detail state.
     */
    resetList: () => {
        set({
            archives: [],
            pagination: { ...INITIAL_PAGINATION },
            isListLoading: false,
            listError: null,
            filters: {},
            _listRequestId: 0,
        });
    },
}));
