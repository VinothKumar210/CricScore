import { useState, useEffect, useCallback } from 'react';
import {
    fetchSettings,
    updateSettings,
    resetSettings,
} from './settingsService';
import type { UserSettings, Visibility, Theme } from './settingsService';
import {
    Bell, Eye, Palette, RotateCcw, Loader2, Settings, Check, Shield
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Main Component ───

export const SettingsPage = () => {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings()
            .then(setSettings)
            .catch(() => setError('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = useCallback(async (key: keyof UserSettings, value: unknown) => {
        if (!settings) return;
        const prev = { ...settings };
        setSettings({ ...settings, [key]: value });
        setSaving(true);
        setError(null);
        try {
            const updated = await updateSettings({ [key]: value });
            setSettings(updated);
            flashSuccess('Saved');
        } catch {
            setSettings(prev);
            setError('Failed to save');
        } finally {
            setSaving(false);
        }
    }, [settings]);

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
    if (!settings) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Shield className="w-8 h-8 text-destructive" />
            <p className="text-destructive text-sm font-medium">{error || 'Something went wrong'}</p>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-6 px-4 pb-24 space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Settings className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                    Manage notifications, privacy, and appearance
                </p>
            </div>

            {/* Status */}
            {(saving || error || successMsg) && (
                <div className={clsx(
                    "px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2",
                    error ? "bg-destructive/10 text-destructive border-destructive/20"
                        : successMsg ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-primary/10 text-primary border-primary/20"
                )}>
                    {error ? error : successMsg ? (
                        <><Check className="w-4 h-4" />{successMsg}</>
                    ) : (
                        <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                    )}
                </div>
            )}

            {/* ─── Notifications ─── */}
            <Section icon={<Bell className="w-4 h-4 text-primary" />} title="Notifications">
                <ToggleRow
                    label="Push Notifications"
                    description="Master toggle for all push notifications"
                    checked={settings.pushEnabled}
                    onChange={v => handleChange('pushEnabled', v)}
                    primary
                />
                {settings.pushEnabled && (
                    <>
                        <ToggleRow label="Match Milestones" description="50s, 100s, hat-tricks, 5-wicket hauls" checked={settings.notifyMatchMilestones} onChange={v => handleChange('notifyMatchMilestones', v)} />
                        <ToggleRow label="Match Results" description="Win, loss, tie notifications" checked={settings.notifyMatchResults} onChange={v => handleChange('notifyMatchResults', v)} />
                        <ToggleRow label="Tournament Updates" description="Bracket changes, standings" checked={settings.notifyTournamentUpdates} onChange={v => handleChange('notifyTournamentUpdates', v)} />
                        <ToggleRow label="Invites" description="Team and match invite requests" checked={settings.notifyInvites} onChange={v => handleChange('notifyInvites', v)} />
                        <ToggleRow label="Messages" description="New messages in chats" checked={settings.notifyMessages} onChange={v => handleChange('notifyMessages', v)} />
                        <ToggleRow label="Achievements" description="Badge unlocks and milestones" checked={settings.notifyAchievements} onChange={v => handleChange('notifyAchievements', v)} />
                        <ToggleRow label="Match Reminders" description="Alerts before scheduled matches" checked={settings.notifyMatchReminders} onChange={v => handleChange('notifyMatchReminders', v)} />
                    </>
                )}
            </Section>

            {/* ─── Privacy ─── */}
            <Section icon={<Eye className="w-4 h-4 text-primary" />} title="Privacy">
                <SelectRow label="Profile Visibility" description="Who can view your profile" value={settings.profileVisibility} options={VISIBILITY_OPTIONS} onChange={v => handleChange('profileVisibility', v)} />
                <SelectRow label="Stats Visibility" description="Who can see your statistics" value={settings.statsVisibility} options={VISIBILITY_OPTIONS} onChange={v => handleChange('statsVisibility', v)} />
                <SelectRow label="Activity Visibility" description="Who can see match activity" value={settings.activityVisibility} options={VISIBILITY_OPTIONS} onChange={v => handleChange('activityVisibility', v)} />
            </Section>

            {/* ─── Appearance ─── */}
            <Section icon={<Palette className="w-4 h-4 text-primary" />} title="Appearance">
                <SelectRow label="Theme" description="Color scheme" value={settings.theme} options={THEME_OPTIONS} onChange={v => handleChange('theme', v)} />
                <SelectRow label="Language" description="Display language" value={settings.language} options={LANGUAGE_OPTIONS} onChange={v => handleChange('language', v)} />
            </Section>

            {/* ─── Danger Zone ─── */}
            <div className="bg-card rounded-xl border border-destructive/20 p-4">
                <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
                    <RotateCcw className="w-4 h-4" />
                    Reset
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                    Reset all settings to defaults. This cannot be undone.
                </p>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center gap-2"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset All Settings
                </button>
            </div>
        </div>
    );
};

// ─── Sub-Components ───

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div>
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2 pl-1">
            {icon}
            {title}
        </h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
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
    <div className="flex justify-between items-center px-4 py-3.5 border-b border-border last:border-b-0">
        <div className="mr-4">
            <div className={clsx("text-sm", primary ? "font-bold text-foreground" : "font-medium text-foreground")}>{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
        <button
            onClick={() => onChange(!checked)}
            role="switch"
            aria-checked={checked}
            className={clsx(
                "w-11 h-6 rounded-full shrink-0 transition-colors duration-200 relative",
                checked ? "bg-primary" : "bg-secondary border border-border"
            )}
        >
            <div className={clsx(
                "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform duration-200",
                checked ? "translate-x-[22px]" : "translate-x-0.5"
            )} />
        </button>
    </div>
);

const SelectRow = <T extends string>({
    label, description, value, options, onChange,
}: {
    label: string; description: string; value: T;
    options: { value: T; label: string }[]; onChange: (v: T) => void;
}) => (
    <div className="flex justify-between items-center px-4 py-3.5 border-b border-border last:border-b-0">
        <div className="mr-4">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
        <select
            value={value}
            onChange={e => onChange(e.target.value as T)}
            className="h-8 rounded-lg bg-secondary border border-border px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer"
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

const SettingsSkeleton = () => (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
        ))}
    </div>
);

// ─── Option Constants ───

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
