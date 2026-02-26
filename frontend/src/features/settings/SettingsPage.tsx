// =============================================================================
// Settings Page — Full-featured settings UI
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
    fetchSettings,
    updateSettings,
    resetSettings,
} from './settingsService';
import type { UserSettings, Visibility, Theme } from './settingsService';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SettingsPage = () => {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Load settings on mount
    useEffect(() => {
        fetchSettings()
            .then(setSettings)
            .catch(() => setError('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    // Persist a single field change
    const handleChange = useCallback(async (key: keyof UserSettings, value: unknown) => {
        if (!settings) return;

        const prev = { ...settings };
        setSettings({ ...settings, [key]: value }); // optimistic
        setSaving(true);
        setError(null);

        try {
            const updated = await updateSettings({ [key]: value });
            setSettings(updated);
            flashSuccess('Saved');
        } catch {
            setSettings(prev); // rollback
            setError('Failed to save');
        } finally {
            setSaving(false);
        }
    }, [settings]);

    // Reset all
    const handleReset = useCallback(async () => {
        if (!confirm('Reset all settings to defaults?')) return;
        setSaving(true);
        try {
            const defaults = await resetSettings();
            setSettings(defaults);
            flashSuccess('Settings reset');
        } catch {
            setError('Failed to reset');
        } finally {
            setSaving(false);
        }
    }, []);

    const flashSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 2000);
    };

    if (loading) return <SettingsSkeleton />;
    if (!settings) return <div className="p-6 text-center text-red-400">{error || 'Something went wrong'}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 40 }}>
            {/* Page Header */}
            <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Settings</h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #888)' }}>
                    Manage your notifications, privacy, and appearance
                </p>
            </div>

            {/* Status Bar */}
            {(saving || error || successMsg) && (
                <StatusBar saving={saving} error={error} success={successMsg} />
            )}

            {/* ─── SECTION: Push Notifications ─── */}
            <Section title="Notifications">
                <ToggleRow
                    label="Push Notifications"
                    description="Master toggle for all push notifications"
                    checked={settings.pushEnabled}
                    onChange={v => handleChange('pushEnabled', v)}
                    primary
                />

                {settings.pushEnabled && (
                    <>
                        <ToggleRow
                            label="Match Milestones"
                            description="50s, 100s, hat-tricks, 5-wicket hauls"
                            checked={settings.notifyMatchMilestones}
                            onChange={v => handleChange('notifyMatchMilestones', v)}
                        />
                        <ToggleRow
                            label="Match Results"
                            description="Win, loss, tie notifications"
                            checked={settings.notifyMatchResults}
                            onChange={v => handleChange('notifyMatchResults', v)}
                        />
                        <ToggleRow
                            label="Tournament Updates"
                            description="Bracket changes, standings, qualifications"
                            checked={settings.notifyTournamentUpdates}
                            onChange={v => handleChange('notifyTournamentUpdates', v)}
                        />
                        <ToggleRow
                            label="Invites"
                            description="Team and match invite requests"
                            checked={settings.notifyInvites}
                            onChange={v => handleChange('notifyInvites', v)}
                        />
                        <ToggleRow
                            label="Messages"
                            description="New messages in team and match chats"
                            checked={settings.notifyMessages}
                            onChange={v => handleChange('notifyMessages', v)}
                        />
                        <ToggleRow
                            label="Achievements"
                            description="Badge unlocks and milestone completions"
                            checked={settings.notifyAchievements}
                            onChange={v => handleChange('notifyAchievements', v)}
                        />
                        <ToggleRow
                            label="Match Reminders"
                            description="Alerts before scheduled matches"
                            checked={settings.notifyMatchReminders}
                            onChange={v => handleChange('notifyMatchReminders', v)}
                        />
                    </>
                )}
            </Section>

            {/* ─── SECTION: Privacy ─── */}
            <Section title="Privacy">
                <SelectRow
                    label="Profile Visibility"
                    description="Who can view your profile page"
                    value={settings.profileVisibility}
                    options={VISIBILITY_OPTIONS}
                    onChange={v => handleChange('profileVisibility', v)}
                />
                <SelectRow
                    label="Stats Visibility"
                    description="Who can see your career statistics"
                    value={settings.statsVisibility}
                    options={VISIBILITY_OPTIONS}
                    onChange={v => handleChange('statsVisibility', v)}
                />
                <SelectRow
                    label="Activity Visibility"
                    description="Who can see your recent match activity"
                    value={settings.activityVisibility}
                    options={VISIBILITY_OPTIONS}
                    onChange={v => handleChange('activityVisibility', v)}
                />
            </Section>

            {/* ─── SECTION: Appearance ─── */}
            <Section title="Appearance">
                <SelectRow
                    label="Theme"
                    description="Choose your preferred color scheme"
                    value={settings.theme}
                    options={THEME_OPTIONS}
                    onChange={v => handleChange('theme', v)}
                />
                <SelectRow
                    label="Language"
                    description="Display language"
                    value={settings.language}
                    options={LANGUAGE_OPTIONS}
                    onChange={v => handleChange('language', v)}
                />
            </Section>

            {/* ─── SECTION: Danger Zone ─── */}
            <Section title="Reset">
                <div style={{ padding: '16px 0' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary, #888)', marginBottom: 12 }}>
                        Reset all settings to their default values. This cannot be undone.
                    </p>
                    <button
                        onClick={handleReset}
                        style={{
                            padding: '10px 20px', borderRadius: 8,
                            background: 'rgba(217, 96, 85, 0.12)', border: '1px solid rgba(217, 96, 85, 0.3)',
                            color: '#D96055', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Reset All Settings
                    </button>
                </div>
            </Section>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
        <h2 style={{
            fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-muted, #666)', marginBottom: 12,
        }}>
            {title}
        </h2>
        <div style={{
            background: 'var(--bg-card, #191B20)', border: '1px solid var(--border, #2A2D35)',
            borderRadius: 14, overflow: 'hidden',
        }}>
            {children}
        </div>
    </div>
);

const ToggleRow = ({
    label, description, checked, onChange, primary,
}: {
    label: string; description: string; checked: boolean;
    onChange: (v: boolean) => void; primary?: boolean;
}) => (
    <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid var(--border, #2A2D35)',
    }}>
        <div>
            <div style={{ fontSize: 14, fontWeight: primary ? 700 : 500 }}>{label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)', marginTop: 2 }}>{description}</div>
        </div>
        <button
            onClick={() => onChange(!checked)}
            aria-checked={checked}
            role="switch"
            style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 2,
                background: checked ? 'var(--accent, #D7A65B)' : 'var(--border, #2A2D35)',
                transition: 'background 0.2s',
                display: 'flex', alignItems: 'center',
                justifyContent: checked ? 'flex-end' : 'flex-start',
            }}
        >
            <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
        </button>
    </div>
);

const SelectRow = <T extends string>({
    label, description, value, options, onChange,
}: {
    label: string; description: string; value: T;
    options: { value: T; label: string }[]; onChange: (v: T) => void;
}) => (
    <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid var(--border, #2A2D35)',
    }}>
        <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)', marginTop: 2 }}>{description}</div>
        </div>
        <select
            value={value}
            onChange={e => onChange(e.target.value as T)}
            style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'var(--bg-card, #24262D)', border: '1px solid var(--border, #2A2D35)',
                color: 'var(--text-primary, #EBECEF)', fontSize: 13, fontFamily: 'inherit',
                cursor: 'pointer', outline: 'none',
            }}
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

const StatusBar = ({ saving: _saving, error, success }: { saving: boolean; error: string | null; success: string | null }) => (
    <div style={{
        padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
        background: error ? 'rgba(217,96,85,0.1)' : success ? 'rgba(83,138,106,0.1)' : 'rgba(215,166,91,0.1)',
        color: error ? '#D96055' : success ? '#538A6A' : '#D7A65B',
        border: `1px solid ${error ? 'rgba(217,96,85,0.2)' : success ? 'rgba(83,138,106,0.2)' : 'rgba(215,166,91,0.2)'}`,
    }}>
        {error || success || 'Saving...'}
    </div>
);

const SettingsSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
                height: 56, borderRadius: 12,
                background: 'var(--bg-card, #191B20)', opacity: 0.5,
                animation: 'pulse 1.5s infinite',
            }} />
        ))}
    </div>
);

// ---------------------------------------------------------------------------
// Option Constants
// ---------------------------------------------------------------------------

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
    { value: 'PUBLIC', label: 'Everyone' },
    { value: 'FRIENDS', label: 'Teammates Only' },
    { value: 'PRIVATE', label: 'Only Me' },
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
    { value: 'SYSTEM', label: 'System Default' },
    { value: 'DARK', label: 'Dark' },
    { value: 'LIGHT', label: 'Light' },
];

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'hi', label: 'हिन्दी (Hindi)' },
    { value: 'te', label: 'తెలుగు (Telugu)' },
    { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
];
