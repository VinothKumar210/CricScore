// =============================================================================
// Settings — Frontend API Service
// =============================================================================

import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types (mirror backend response)
// ---------------------------------------------------------------------------

export type Visibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface UserSettings {
    // Notifications
    notifyMatchMilestones: boolean;
    notifyMatchResults: boolean;
    notifyTournamentUpdates: boolean;
    notifyInvites: boolean;
    notifyMessages: boolean;
    notifyAchievements: boolean;
    notifyMatchReminders: boolean;
    pushEnabled: boolean;

    // Privacy
    profileVisibility: Visibility;
    statsVisibility: Visibility;
    activityVisibility: Visibility;

    // Appearance
    theme: Theme;
    language: string;
    timezone: string;
}

export type UpdateSettingsPayload = Partial<UserSettings>;

// ---------------------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------------------

export async function fetchSettings(): Promise<UserSettings> {
    const res = await api.get('/settings');
    return res.data.data;
}

export async function updateSettings(payload: UpdateSettingsPayload): Promise<UserSettings> {
    const res = await api.patch('/settings', payload);
    return res.data.data;
}

export async function resetSettings(): Promise<UserSettings> {
    const res = await api.post('/settings/reset');
    return res.data.data;
}
