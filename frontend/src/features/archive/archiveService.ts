/**
 * archiveService.ts — Archive API calls (authenticated)
 */

import type { ArchiveListResponse, ArchivedMatchFull, ArchiveFiltersState } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Fetch paginated archive list (metadata only, no events).
 */
export async function fetchArchiveList(
    page: number = 1,
    pageSize: number = 20,
    filters?: ArchiveFiltersState,
): Promise<ArchiveListResponse> {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    if (filters?.teamName) params.set('team', filters.teamName);
    if (filters?.tournament) params.set('tournament', filters.tournament);

    const res = await fetch(`${API_BASE}/api/archive?${params}`, {
        headers: getAuthHeaders(),
    });

    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) throw new Error(`Archive list failed: ${res.status}`);

    const json = await res.json();
    if (json.success) return json.data;
    throw new Error(json.error || 'Unknown error');
}

/**
 * Fetch full archive detail (with events + matchConfig).
 */
export async function fetchArchiveDetail(archiveId: string): Promise<ArchivedMatchFull> {
    const res = await fetch(`${API_BASE}/api/archive/${archiveId}`, {
        headers: getAuthHeaders(),
    });

    if (res.status === 401) throw new Error('Unauthorized');
    if (res.status === 403) throw new Error('Not authorized to view this archive');
    if (res.status === 404) throw new Error('Archive not found');
    if (!res.ok) throw new Error(`Archive detail failed: ${res.status}`);

    const json = await res.json();
    if (json.success) return json.data;
    throw new Error(json.error || 'Unknown error');
}
