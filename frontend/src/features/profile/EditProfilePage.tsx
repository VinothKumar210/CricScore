// =============================================================================
// Edit Profile Page — Avatar upload + profile fields
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
    id: string;
    fullName: string;
    username: string | null;
    description: string | null;
    profilePictureUrl: string | null;
    role: string | null;
    battingHand: string | null;
    bowlingStyle: string | null;
    jerseyNumber: number | null;
    city: string | null;
    state: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EditProfilePage = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Load profile
    useEffect(() => {
        api.get('/profile')
            .then(r => setProfile(r.data.data.user || r.data.data))
            .catch(() => setStatus({ type: 'error', msg: 'Failed to load profile' }))
            .finally(() => setLoading(false));
    }, []);

    // Save text fields
    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        setStatus(null);
        try {
            const { fullName, username, description, role, battingHand, bowlingStyle, jerseyNumber, city, state } = profile;
            const payload: Record<string, unknown> = {
                fullName, description, role, battingHand, bowlingStyle, jerseyNumber, city, state,
            };
            if (username) payload.username = username;

            const res = await api.patch('/profile', payload);
            setProfile(res.data.data.user || res.data.data);
            flash('success', 'Profile updated');
        } catch (err: any) {
            flash('error', err?.response?.data?.error?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    // Avatar upload
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation
        if (file.size > 5 * 1024 * 1024) {
            return flash('error', 'File must be under 5 MB');
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            return flash('error', 'Only JPEG, PNG, or WebP');
        }

        setUploading(true);
        setStatus(null);
        try {
            const form = new FormData();
            form.append('avatar', file);
            const res = await api.post('/profile/avatar', form);
            setProfile(prev => prev ? { ...prev, profilePictureUrl: res.data.data.user.profilePictureUrl } : prev);
            flash('success', 'Avatar updated');
        } catch (err: any) {
            flash('error', err?.response?.data?.error?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    // Remove avatar
    const handleRemoveAvatar = async () => {
        setUploading(true);
        try {
            await api.delete('/profile/avatar');
            setProfile(prev => prev ? { ...prev, profilePictureUrl: null } : prev);
            flash('success', 'Avatar removed');
        } catch {
            flash('error', 'Failed to remove avatar');
        } finally {
            setUploading(false);
        }
    };

    const flash = (type: 'success' | 'error', msg: string) => {
        setStatus({ type, msg });
        setTimeout(() => setStatus(null), 3000);
    };

    const updateField = (key: keyof UserProfile, value: unknown) => {
        setProfile(prev => prev ? { ...prev, [key]: value } : prev);
    };

    if (loading) return <LoadingSkeleton />;
    if (!profile) return <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Could not load profile</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Edit Profile</h1>

            {/* Status */}
            {status && (
                <div style={{
                    padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                    background: status.type === 'error' ? 'rgba(217,96,85,0.1)' : 'rgba(83,138,106,0.1)',
                    color: status.type === 'error' ? '#D96055' : '#538A6A',
                    border: `1px solid ${status.type === 'error' ? 'rgba(217,96,85,0.2)' : 'rgba(83,138,106,0.2)'}`,
                }}>
                    {status.msg}
                </div>
            )}

            {/* Avatar Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                        width: 88, height: 88, borderRadius: '50%', cursor: 'pointer',
                        background: profile.profilePictureUrl
                            ? `url(${profile.profilePictureUrl}) center/cover`
                            : 'var(--bg-surface, #24262D)',
                        border: '3px solid var(--border, #2A2D35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 700, color: 'var(--text-secondary, #888)',
                        position: 'relative', overflow: 'hidden',
                    }}
                >
                    {!profile.profilePictureUrl && profile.fullName.charAt(0)}
                    {uploading && (
                        <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, color: '#fff',
                        }}>
                            ...
                        </div>
                    )}
                </div>
                <div>
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        style={{
                            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                            background: 'var(--bg-surface, #24262D)', border: '1px solid var(--border, #2A2D35)',
                            color: 'var(--text-primary, #eee)', cursor: 'pointer', fontFamily: 'inherit',
                            marginRight: 8,
                        }}
                    >
                        {uploading ? 'Uploading...' : 'Change Photo'}
                    </button>
                    {profile.profilePictureUrl && (
                        <button
                            onClick={handleRemoveAvatar}
                            disabled={uploading}
                            style={{
                                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                background: 'transparent', border: '1px solid rgba(217,96,85,0.3)',
                                color: '#D96055', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            Remove
                        </button>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-secondary, #888)', marginTop: 8 }}>
                        JPG, PNG, or WebP. Max 5 MB.
                    </p>
                </div>
                <input
                    ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange} style={{ display: 'none' }}
                />
            </div>

            {/* Form Fields */}
            <FormSection title="Basic Info">
                <Field label="Full Name" value={profile.fullName} onChange={v => updateField('fullName', v)} />
                <Field label="Username" value={profile.username || ''} onChange={v => updateField('username', v)} placeholder="@username" />
                <Field label="Bio" value={profile.description || ''} onChange={v => updateField('description', v)} multiline />
            </FormSection>

            <FormSection title="Cricket Info">
                <SelectField
                    label="Playing Role"
                    value={profile.role || ''}
                    onChange={v => updateField('role', v || null)}
                    options={[
                        { value: '', label: 'Select role...' },
                        { value: 'BATSMAN', label: 'Batsman' },
                        { value: 'BOWLER', label: 'Bowler' },
                        { value: 'ALL_ROUNDER', label: 'All-Rounder' },
                        { value: 'WICKET_KEEPER_BATSMAN', label: 'Wicket-Keeper Batsman' },
                    ]}
                />
                <SelectField
                    label="Batting Hand"
                    value={profile.battingHand || ''}
                    onChange={v => updateField('battingHand', v || null)}
                    options={[
                        { value: '', label: 'Select...' },
                        { value: 'RIGHT_HANDED', label: 'Right Handed' },
                        { value: 'LEFT_HANDED', label: 'Left Handed' },
                    ]}
                />
                <SelectField
                    label="Bowling Style"
                    value={profile.bowlingStyle || ''}
                    onChange={v => updateField('bowlingStyle', v || null)}
                    options={[
                        { value: '', label: 'Select...' },
                        { value: 'RIGHT_ARM_FAST', label: 'Right Arm Fast' },
                        { value: 'RIGHT_ARM_MEDIUM', label: 'Right Arm Medium' },
                        { value: 'LEFT_ARM_FAST', label: 'Left Arm Fast' },
                        { value: 'LEFT_ARM_MEDIUM', label: 'Left Arm Medium' },
                        { value: 'RIGHT_ARM_SPIN', label: 'Right Arm Spin' },
                        { value: 'LEFT_ARM_SPIN', label: 'Left Arm Spin' },
                    ]}
                />
                <Field
                    label="Jersey Number" type="number"
                    value={profile.jerseyNumber?.toString() || ''}
                    onChange={v => updateField('jerseyNumber', v ? parseInt(v) : null)}
                />
            </FormSection>

            <FormSection title="Location">
                <Field label="City" value={profile.city || ''} onChange={v => updateField('city', v || null)} />
                <Field label="State" value={profile.state || ''} onChange={v => updateField('state', v || null)} />
            </FormSection>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                    background: 'var(--accent, #D7A65B)', border: 'none',
                    color: '#0a0e1a', cursor: 'pointer', fontFamily: 'inherit',
                    opacity: saving ? 0.6 : 1, transition: 'opacity 0.2s',
                }}
            >
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
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

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 0', fontSize: 14,
    background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--text-primary, #EBECEF)', fontFamily: 'inherit',
};

const Field = ({
    label, value, onChange, placeholder, multiline, type = 'text',
}: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; multiline?: boolean; type?: string;
}) => (
    <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border, #2A2D35)',
        display: 'flex', flexDirection: 'column', gap: 4,
    }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #888)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
        </label>
        {multiline ? (
            <textarea
                value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            />
        ) : (
            <input
                type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                style={inputStyle}
            />
        )}
    </div>
);

const SelectField = ({
    label, value, onChange, options,
}: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) => (
    <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border, #2A2D35)',
        display: 'flex', flexDirection: 'column', gap: 4,
    }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #888)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
        </label>
        <select
            value={value} onChange={e => onChange(e.target.value)}
            style={{
                ...inputStyle,
                cursor: 'pointer', padding: '10px 0',
            }}
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

const LoadingSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#191B20' }} />
        {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 56, borderRadius: 12, background: '#191B20', opacity: 0.5 }} />
        ))}
    </div>
);
