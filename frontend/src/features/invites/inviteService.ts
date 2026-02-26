export interface Invite {
    id: string;
    teamId: string;
    preferredDate?: string;
    preferredTime?: string;
    overs?: number;
    ballType?: string;
    message?: string;
    latitude: number;
    longitude: number;
    radius: number;
    expiresAt?: string;
    status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
    createdAt: string;
    team: {
        id: string;
        name: string;
        logoUrl?: string;
    };
    responses?: Array<{
        id: string;
        responderTeamId: string;
        status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
        responderTeam: {
            id: string;
            name: string;
            logoUrl?: string;
        }
    }>;
}

export const inviteService = {
    getInvites: async (type: 'received' | 'sent') => {
        const { data } = await api.get(`/api/invites?type=${type}`);
        // Assuming backend returns an array directly or inside { invites: [] }. Adjusting based on standard pattern.
        return (data.invites || data) as Invite[];
    },

    respond: async (inviteId: string, responderTeamId: string, status: 'ACCEPTED' | 'DECLINED') => {
        const { data } = await api.post(`/api/invites/${inviteId}/respond`, {
            responderTeamId,
            status
        });
        return data; // returns updated response/invite
    }
};
