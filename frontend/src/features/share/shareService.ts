/**
 * shareService.ts — Public Share API calls (no auth required)
 */

import type { ScrubbedMatch, ShareEventsResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch scrubbed match summary (public, no auth).
 * Returns null on 404, throws on other errors.
 */
export async function fetchShareMatch(matchId: string): Promise<{
    data: ScrubbedMatch | null;
    httpStatus: number;
}> {
    const res = await fetch(`${API_BASE}/api/share/${matchId}`);

    if (res.status === 404) return { data: null, httpStatus: 404 };
    if (res.status === 403) return { data: null, httpStatus: 403 };
    if (res.status === 429) throw new Error('Rate limited — please wait');

    if (!res.ok) throw new Error(`Share fetch failed: ${res.status}`);

    const json = await res.json();
    if (json.success) return { data: json.data, httpStatus: 200 };
    throw new Error(json.error || 'Unknown error');
}

/**
 * Fetch match events for replay (public, no auth).
 * Only works for COMPLETED/ABANDONED matches.
 * Returns 403 for LIVE/SCHEDULED.
 */
export async function fetchShareEvents(matchId: string): Promise<{
    data: ShareEventsResponse | null;
    httpStatus: number;
}> {
    const res = await fetch(`${API_BASE}/api/share/${matchId}/events`);

    if (res.status === 403) return { data: null, httpStatus: 403 };
    if (res.status === 404) return { data: null, httpStatus: 404 };
    if (res.status === 429) throw new Error('Rate limited — please wait');

    if (!res.ok) throw new Error(`Events fetch failed: ${res.status}`);

    const json = await res.json();
    if (json.success) return { data: json.data, httpStatus: 200 };
    throw new Error(json.error || 'Unknown error');
}
