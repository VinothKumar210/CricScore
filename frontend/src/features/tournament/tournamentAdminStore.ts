/**
 * tournamentAdminStore.ts — Zustand store for Tournament Admin UI
 *
 * ARCHITECTURAL RULES:
 * ✅ Manages: list loading, detail loading, API calls, errors
 * ✅ Hydrates tournamentStore with raw domain data after fetchDetail
 * ❌ Does NOT store league table
 * ❌ Does NOT compute NRR
 * ❌ Does NOT import engine files
 * ❌ Does NOT duplicate engine logic
 */

import { create } from 'zustand';
import {
    fetchTournamentList,
    fetchTournamentDetail,
    createTournament as createTournamentAPI,
    registerTeamAPI,
    generateFixturesAPI,
} from './tournamentAdminService';
import type {
    TournamentMeta,
    TournamentDetail,
    CreateTournamentInput,
} from './tournamentAdminService';
import { useTournamentStore } from './tournamentStore';

interface TournamentAdminState {
    // List
    tournaments: TournamentMeta[];
    isListLoading: boolean;
    listError: string | null;

    // Detail
    activeTournament: TournamentDetail | null;
    isDetailLoading: boolean;
    detailError: string | null;

    // Actions
    fetchList: () => Promise<void>;
    fetchDetail: (id: string) => Promise<void>;
    createTournament: (data: CreateTournamentInput) => Promise<string>;
    registerTeam: (tournamentId: string, teamId: string) => Promise<void>;
    generateFixtures: (tournamentId: string) => Promise<void>;
    resetList: () => void;
    resetDetail: () => void;
}

export const useTournamentAdminStore = create<TournamentAdminState>((set, get) => ({
    // Initial state
    tournaments: [],
    isListLoading: false,
    listError: null,
    activeTournament: null,
    isDetailLoading: false,
    detailError: null,

    fetchList: async () => {
        set({ isListLoading: true, listError: null });
        try {
            const tournaments = await fetchTournamentList();
            set({ tournaments, isListLoading: false });
        } catch (err: any) {
            set({ listError: err?.message || 'Failed to load tournaments', isListLoading: false });
        }
    },

    fetchDetail: async (id: string) => {
        set({ isDetailLoading: true, detailError: null, activeTournament: null });
        try {
            const detail = await fetchTournamentDetail(id);
            set({ activeTournament: detail, isDetailLoading: false });

            // ═══ CRITICAL: Hydrate tournamentStore with raw domain data ═══
            // This is the ONLY place domain data enters the engine store.
            // Engine selectors (getLeagueTable, etc.) read from HERE.
            // We do NOT pass matches directly to StandingsTable.
            // We do NOT re-run deriveLeagueTable locally.
            hydrateTournamentStore(detail);
        } catch (err: any) {
            set({ detailError: err?.message || 'Failed to load tournament', isDetailLoading: false });
        }
    },

    createTournament: async (data: CreateTournamentInput) => {
        const result = await createTournamentAPI(data);
        // Refresh list after creation
        get().fetchList();
        return result.id;
    },

    registerTeam: async (tournamentId: string, teamId: string) => {
        await registerTeamAPI(tournamentId, teamId);
        // Refetch detail to update team list
        get().fetchDetail(tournamentId);
    },

    generateFixtures: async (tournamentId: string) => {
        await generateFixturesAPI(tournamentId);
        // Refetch detail to show generated fixtures
        get().fetchDetail(tournamentId);
    },

    resetList: () => {
        set({ tournaments: [], isListLoading: false, listError: null });
    },

    resetDetail: () => {
        set({ activeTournament: null, isDetailLoading: false, detailError: null });
        // Clear engine store's domain data
        useTournamentStore.getState().setCompletedMatches([]);
    },
}));

/**
 * Hydrates the engine-pure tournamentStore with raw domain data.
 *
 * Maps backend standings (which include match results metadata)
 * into CompletedMatch[] shape the engine expects.
 *
 * NOTE: The actual CompletedMatch data requires full match results.
 * Since the backend standings are pre-computed, we hydrate what we have.
 * For now, completedMatches is set to empty — the engine selectors
 * will derive from this. When the backend provides full match result data
 * on the tournament detail endpoint, this hydration can be extended.
 */
function hydrateTournamentStore(_detail: TournamentDetail): void {
    // The backend pre-computes standings and stores them.
    // The frontend engine (deriveLeagueTable) needs CompletedMatch[] to derive standings.
    // If the backend provides match results, we map them here.
    // For now, we leave completedMatches empty as the backend standings
    // are directly usable in the UI and the engine derivation requires
    // complete match-level data (runs, overs, allOut) that the detail endpoint
    // may not yet provide.
    useTournamentStore.getState().setCompletedMatches([]);
}
