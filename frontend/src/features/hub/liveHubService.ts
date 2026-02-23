/**
 * liveHubService.ts — Hub Feed API calls
 *
 * GET /api/hub/feed — authenticated user feed
 * GET /api/hub/live-count — public live match count
 *
 * Falls back to mock data when backend is unavailable.
 */

import type { HubFeedResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch the user's hub feed from backend.
 * Returns: yourMatches (LIVE first), liveMatches, recentCompleted, liveCount
 */
export async function fetchHubFeed(): Promise<HubFeedResponse> {
    try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE}/api/hub/feed`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        if (!res.ok) {
            throw new Error(`Hub feed failed: ${res.status}`);
        }

        const json = await res.json();
        if (json.success) return json.data;
        throw new Error(json.error || 'Unknown error');
    } catch {
        // Fallback to mock data for development
        return getMockFeed();
    }
}

/**
 * Fetch global live match count (public, no auth).
 */
export async function fetchLiveCount(): Promise<number> {
    try {
        const res = await fetch(`${API_BASE}/api/hub/live-count`);
        const json = await res.json();
        if (json.success) return json.data.liveCount;
        return 0;
    } catch {
        return 0;
    }
}

// ─── Mock Data (Development Fallback) ───

function getMockFeed(): HubFeedResponse {
    return {
        yourMatches: [
            {
                id: '1',
                status: 'LIVE',
                homeTeamName: 'Cric Tigers',
                awayTeamName: 'Green Warriors',
                homeTeam: { id: 't1', name: 'Cric Tigers', shortName: 'CT' },
                awayTeam: { id: 't2', name: 'Green Warriors', shortName: 'GW' },
                scoreA: { runs: 142, wickets: 3, overs: '18.4' },
                matchDate: new Date().toISOString(),
                tournamentName: 'Weekday Blast',
                isUserInvolved: true,
            },
            {
                id: '2',
                status: 'SCHEDULED',
                homeTeamName: 'Chennai Kings',
                awayTeamName: 'Mumbai Indians',
                homeTeam: { id: 't3', name: 'Chennai Kings', shortName: 'CK' },
                awayTeam: { id: 't4', name: 'Mumbai Indians', shortName: 'MI' },
                matchDate: new Date(Date.now() + 86400000).toISOString(),
                isUserInvolved: true,
            },
        ],
        liveMatches: [
            {
                id: '3',
                status: 'LIVE',
                homeTeamName: 'Sunrise XI',
                awayTeamName: 'Thunder CC',
                homeTeam: { id: 't5', name: 'Sunrise XI', shortName: 'SX' },
                awayTeam: { id: 't6', name: 'Thunder CC', shortName: 'TC' },
                scoreA: { runs: 45, wickets: 1, overs: '5.2' },
                matchDate: new Date().toISOString(),
                isUserInvolved: false,
            },
            {
                id: '5',
                status: 'LIVE',
                homeTeamName: 'Alpha 11',
                awayTeamName: 'Beta 11',
                homeTeam: { id: 't9', name: 'Alpha 11', shortName: 'A11' },
                awayTeam: { id: 't10', name: 'Beta 11', shortName: 'B11' },
                scoreA: { runs: 200, wickets: 2, overs: '20.0' },
                scoreB: { runs: 180, wickets: 5, overs: '18.0' },
                matchDate: new Date().toISOString(),
                isUserInvolved: false,
            },
        ],
        recentCompleted: [
            {
                id: '4',
                status: 'COMPLETED',
                homeTeamName: 'Old Stars',
                awayTeamName: 'New Comers',
                homeTeam: { id: 't7', name: 'Old Stars', shortName: 'OS' },
                awayTeam: { id: 't8', name: 'New Comers', shortName: 'NC' },
                scoreA: { runs: 120, wickets: 10, overs: '19.5' },
                scoreB: { runs: 121, wickets: 4, overs: '16.2' },
                result: 'New Comers won by 6 wickets',
                matchDate: new Date(Date.now() - 86400000).toISOString(),
                isUserInvolved: false,
            },
        ],
        liveCount: 3,
    };
}
