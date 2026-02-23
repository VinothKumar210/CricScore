/**
 * exportService.ts — Export API + download helpers
 */

import type { ArchivedMatchFull } from '../archive/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Fetch archive export data from backend (JSON format).
 */
export async function fetchArchiveExport(archiveId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/archive/${archiveId}/export`, {
        headers: getAuthHeaders(),
    });

    if (res.status === 401) throw new Error('Unauthorized');
    if (res.status === 403) throw new Error('Not authorized to export this archive');
    if (res.status === 404) throw new Error('Archive not found');
    if (!res.ok) throw new Error(`Export fetch failed: ${res.status}`);

    const json = await res.json();
    if (json.success) return json.data;
    throw new Error(json.error || 'Export failed');
}

/**
 * Generate a safe filename from match data.
 * Format: "{homeTeam}_vs_{awayTeam}_{YYYY-MM-DD}"
 */
export function generateFilename(archive: ArchivedMatchFull, ext: string): string {
    const home = archive.homeTeamName.replace(/[^a-zA-Z0-9]/g, '');
    const away = archive.awayTeamName.replace(/[^a-zA-Z0-9]/g, '');
    const date = new Date(archive.matchDate).toISOString().split('T')[0];
    return `${home}_vs_${away}_${date}.${ext}`;
}

/**
 * Trigger a browser download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
