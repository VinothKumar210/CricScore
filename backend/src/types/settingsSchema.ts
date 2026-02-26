// =============================================================================
// User Settings — Zod Validation Schemas
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum Mirrors (must match Prisma enums)
// ---------------------------------------------------------------------------

export const VisibilityEnum = z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']);
export const ThemeEnum = z.enum(['LIGHT', 'DARK', 'SYSTEM']);

// ---------------------------------------------------------------------------
// Update Schema — partial, every field is optional
// ---------------------------------------------------------------------------

export const updateSettingsSchema = z.object({

    // Notification Preferences
    notifyMatchMilestones: z.boolean().optional(),
    notifyMatchResults: z.boolean().optional(),
    notifyTournamentUpdates: z.boolean().optional(),
    notifyInvites: z.boolean().optional(),
    notifyMessages: z.boolean().optional(),
    notifyAchievements: z.boolean().optional(),
    notifyMatchReminders: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),

    // Privacy Controls
    profileVisibility: VisibilityEnum.optional(),
    statsVisibility: VisibilityEnum.optional(),
    activityVisibility: VisibilityEnum.optional(),

    // Appearance
    theme: ThemeEnum.optional(),
    language: z.string().min(2).max(10).optional(),    // e.g. "en", "ta", "hi"
    timezone: z.string().min(3).max(50).optional(),    // e.g. "Asia/Kolkata"

}).strict(); // reject unknown fields

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// ---------------------------------------------------------------------------
// Response Shape (for frontend typing)
// ---------------------------------------------------------------------------

export const settingsResponseSchema = z.object({
    notifyMatchMilestones: z.boolean(),
    notifyMatchResults: z.boolean(),
    notifyTournamentUpdates: z.boolean(),
    notifyInvites: z.boolean(),
    notifyMessages: z.boolean(),
    notifyAchievements: z.boolean(),
    notifyMatchReminders: z.boolean(),
    pushEnabled: z.boolean(),
    profileVisibility: VisibilityEnum,
    statsVisibility: VisibilityEnum,
    activityVisibility: VisibilityEnum,
    theme: ThemeEnum,
    language: z.string(),
    timezone: z.string(),
});

export type SettingsResponse = z.infer<typeof settingsResponseSchema>;
