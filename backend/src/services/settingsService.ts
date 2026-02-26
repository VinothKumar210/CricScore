// =============================================================================
// User Settings — Service Layer
// =============================================================================

import { prisma } from '../utils/db.js';
import type { UpdateSettingsInput, SettingsResponse } from '../types/settingsSchema.js';

// Fields to return (excludes id, userId, timestamps)
const SETTINGS_SELECT = {
    notifyMatchMilestones: true,
    notifyMatchResults: true,
    notifyTournamentUpdates: true,
    notifyInvites: true,
    notifyMessages: true,
    notifyAchievements: true,
    notifyMatchReminders: true,
    pushEnabled: true,
    profileVisibility: true,
    statsVisibility: true,
    activityVisibility: true,
    theme: true,
    language: true,
    timezone: true,
} as const;

// Use (prisma as any) to work around Prisma client type generation timing
// The userSettings model exists in schema but types may not be available at build time
const db = prisma as any;

// ---------------------------------------------------------------------------
// GET — returns existing settings or creates defaults lazily
// ---------------------------------------------------------------------------

export async function getUserSettings(userId: string): Promise<SettingsResponse> {
    const settings = await db.userSettings.upsert({
        where: { userId },
        update: {},                    // no-op if exists
        create: { userId },           // all defaults from schema
        select: SETTINGS_SELECT,
    });

    return settings as SettingsResponse;
}

// ---------------------------------------------------------------------------
// PATCH — partial update, only touches fields present in input
// ---------------------------------------------------------------------------

export async function updateUserSettings(
    userId: string,
    data: UpdateSettingsInput,
): Promise<SettingsResponse> {
    // Ensure the record exists first (upsert pattern)
    const settings = await db.userSettings.upsert({
        where: { userId },
        update: data,
        create: { userId, ...data },
        select: SETTINGS_SELECT,
    });

    return settings as SettingsResponse;
}

// ---------------------------------------------------------------------------
// DELETE — reset all settings to defaults
// ---------------------------------------------------------------------------

export async function resetUserSettings(userId: string): Promise<SettingsResponse> {
    // Delete existing record
    await db.userSettings.deleteMany({ where: { userId } });

    // Re-create with all defaults
    const settings = await db.userSettings.create({
        data: { userId },
        select: SETTINGS_SELECT,
    });

    return settings as SettingsResponse;
}

// ---------------------------------------------------------------------------
// Helper — check if a user's profile is visible to a viewer
// ---------------------------------------------------------------------------

export async function isProfileVisibleTo(
    targetUserId: string,
    viewerUserId: string | null,
): Promise<boolean> {
    if (targetUserId === viewerUserId) return true; // always see your own

    const settings = await getUserSettings(targetUserId);

    switch (settings.profileVisibility) {
        case 'PUBLIC':
            return true;

        case 'FRIENDS': {
            if (!viewerUserId) return false;
            // "Friends" = share at least one team
            const sharedTeams = await prisma.teamMember.findMany({
                where: {
                    userId: { in: [targetUserId, viewerUserId] },
                },
                select: { teamId: true, userId: true },
            });
            const targetTeams = new Set(
                sharedTeams.filter((m: { teamId: string; userId: string }) => m.userId === targetUserId).map((m: { teamId: string }) => m.teamId),
            );
            return sharedTeams.some(
                (m: { teamId: string; userId: string }) => m.userId === viewerUserId && targetTeams.has(m.teamId),
            );
        }

        case 'PRIVATE':
            return false;

        default:
            return true;
    }
}

// ---------------------------------------------------------------------------
// Helper — check notification preference before sending
// ---------------------------------------------------------------------------

type NotificationKey =
    | 'notifyMatchMilestones'
    | 'notifyMatchResults'
    | 'notifyTournamentUpdates'
    | 'notifyInvites'
    | 'notifyMessages'
    | 'notifyAchievements'
    | 'notifyMatchReminders';

export async function shouldNotify(
    userId: string,
    type: NotificationKey,
): Promise<boolean> {
    const settings = await getUserSettings(userId);
    if (!settings.pushEnabled) return false; // master toggle off
    return settings[type];
}
