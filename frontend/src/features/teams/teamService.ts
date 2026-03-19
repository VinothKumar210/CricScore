import { api } from '../../lib/api';

// ─── Types ───

export interface TeamMember {
    id: string;
    userId: string;
    teamId: string;
    role: 'OWNER' | 'CAPTAIN' | 'VICE_CAPTAIN' | 'PLAYER';
    user: {
        id: string;
        fullName: string;
        profilePictureUrl?: string;
        role?: string; // Cricket role (Batsman, Bowler, etc.)
    };
}

export interface Team {
    id: string;
    name: string;
    shortName?: string;
    city?: string;
    ownerId: string;
    inviteCode: string;
    matchesConfirmed: number;
    matchesCancelled: number;
    reliability: number;
    members: TeamMember[];
    createdAt: string;
}

export interface TeamListItem {
    id: string;
    name: string;
    shortName?: string;
    city?: string;
    memberCount: number;
    reliability: number;
    userRole?: string;
}

// ─── API Service ───

export const teamService = {
    /** Get team details with members */
    getTeamDetail: async (teamId: string): Promise<Team> => {
        const res = await api.get(`/api/teams/${teamId}`);
        return res.data?.team || res.team;
    },

    /** Get user's teams */
    getUserTeams: async (): Promise<TeamListItem[]> => {
        const res = await api.get('/api/teams');
        return res.data?.teams || res.teams || [];
    },

    /** Create a new team */
    createTeam: async (data: { name: string; city?: string; shortName?: string }): Promise<Team> => {
        const res = await api.post('/api/teams', data);
        return res.data?.team || res.team;
    },

    /** Update team details */
    updateTeam: async (teamId: string, data: { name?: string; city?: string; shortName?: string }): Promise<Team> => {
        const res = await api.patch(`/api/teams/${teamId}`, data);
        return res.data?.team || res.team;
    },

    /** Delete team */
    deleteTeam: async (teamId: string): Promise<void> => {
        await api.delete(`/api/teams/${teamId}`);
    },

    /** Join team by invite code */
    joinByCode: async (joinCode: string): Promise<void> => {
        await api.post('/api/teams/join', { joinCode });
    },

    /** Add member to team */
    addMember: async (teamId: string, userId: string, role: string = 'PLAYER'): Promise<void> => {
        await api.post(`/api/teams/${teamId}/members`, { userId, role });
    },

    /** Remove member from team */
    removeMember: async (teamId: string, memberId: string): Promise<void> => {
        await api.delete(`/api/teams/${teamId}/members/${memberId}`);
    },

    /** Update member role */
    updateMemberRole: async (teamId: string, memberId: string, role: string): Promise<void> => {
        await api.patch(`/api/teams/${teamId}/members/${memberId}`, { role });
    },

    /** Get QR code for team */
    getQRCode: async (teamId: string): Promise<{ inviteCode: string; qrCode: string }> => {
        const res = await api.get(`/api/teams/${teamId}/qr`);
        return res.data || res;
    },

    /** Look up a team by invite code */
    getTeamByCode: async (code: string): Promise<any> => {
        const res = await api.get(`/api/teams/code/${code}`);
        return res.data?.team || res.team || res;
    },
};
