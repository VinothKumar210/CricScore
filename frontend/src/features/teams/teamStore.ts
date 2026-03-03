import { create } from 'zustand';
import { teamService } from './teamService';
import type { Team } from './teamService';

interface TeamStore {
    // Detail
    team: Team | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchTeam: (teamId: string) => Promise<void>;
    createTeam: (data: { name: string; city?: string; shortName?: string }) => Promise<Team>;
    joinByCode: (code: string) => Promise<void>;
    removeMember: (teamId: string, memberId: string) => Promise<void>;
    updateMemberRole: (teamId: string, memberId: string, role: string) => Promise<void>;
    deleteTeam: (teamId: string) => Promise<void>;
    reset: () => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
    team: null,
    isLoading: false,
    error: null,

    fetchTeam: async (teamId: string) => {
        set({ isLoading: true, error: null });
        try {
            const team = await teamService.getTeamDetail(teamId);
            set({ team, isLoading: false });
        } catch (err: any) {
            set({ error: err.message || 'Failed to load team', isLoading: false });
        }
    },

    createTeam: async (data) => {
        const team = await teamService.createTeam(data);
        return team;
    },

    joinByCode: async (code: string) => {
        await teamService.joinByCode(code);
    },

    removeMember: async (teamId: string, memberId: string) => {
        await teamService.removeMember(teamId, memberId);
        // Refetch
        await get().fetchTeam(teamId);
    },

    updateMemberRole: async (teamId: string, memberId: string, role: string) => {
        await teamService.updateMemberRole(teamId, memberId, role);
        await get().fetchTeam(teamId);
    },

    deleteTeam: async (teamId: string) => {
        await teamService.deleteTeam(teamId);
        set({ team: null });
    },

    reset: () => set({ team: null, isLoading: false, error: null }),
}));
