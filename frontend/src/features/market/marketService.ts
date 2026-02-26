import { api } from '../../lib/api';

export interface MarketMatch {
    id: string;
    teamId: string;
    preferredDate?: string;
    preferredTime?: string;
    overs?: number;
    ballType?: string;
    latitude: number;
    longitude: number;
    radius: number;
    message?: string;
    status: string;
    team: {
        id: string;
        name: string;
        logoUrl?: string;
        reliability?: number;
    };
    responses?: Array<{
        id: string;
        responderTeamId: string;
        status: string;
    }>;
}

export interface MarketFiltersContext {
    lat: number;
    lon: number;
    radius?: number;
    overs?: number;
    ballType?: string;
}

export const marketService = {
    getFeed: async (filters: MarketFiltersContext, signal?: AbortSignal) => {
        const params = new URLSearchParams();
        params.append('latitude', filters.lat.toString());
        params.append('longitude', filters.lon.toString());

        if (filters.radius) params.append('radius', filters.radius.toString());
        if (filters.overs) params.append('overs', filters.overs.toString());
        if (filters.ballType) params.append('ballType', filters.ballType);

        const { data } = await api.get(`/api/invites/feed?${params.toString()}`, { signal } as any);
        return data as MarketMatch[];
    },

    sendInvite: async (matchId: string, responderTeamId: string, proposal: any = {}) => {
        const { data } = await api.post(`/api/invites/${matchId}/respond`, {
            responderTeamId,
            status: 'COUNTER',
            proposal
        });
        return data;
    }
};
