import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Container } from '../../components/ui/Container';
import {
    ChevronLeft, Camera, Trash2, Loader2, User, AtSign, FileText,
    Shield, Hand, Target, Hash, MapPin, Save, Check
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ───

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

// ─── Main Component ───

export const EditProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get('/profile')
            .then(r => setProfile(r.data.data.user || r.data.data))
            .catch(() => setStatus({ type: 'error', msg: 'Failed to load profile' }))
            .finally(() => setLoading(false));
    }, []);

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

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return flash('error', 'File must be under 5 MB');
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return flash('error', 'Only JPEG, PNG, or WebP');

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
    if (!profile) return (
        <Container className="py-6">
            <div className="flex flex-col items-center py-16 gap-3">
                <User className="w-8 h-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Could not load profile</p>
            </div>
        </Container>
    );

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    return (
        <Container className="py-6 pb-24 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg bg-secondary border border-border hover:bg-card transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Edit Profile</h1>
                    <p className="text-sm text-muted-foreground">Update your info</p>
                </div>
            </div>

            {/* Status */}
            {status && (
                <div className={clsx(
                    "px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2",
                    status.type === 'error'
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}>
                    {status.type === 'success' && <Check className="w-4 h-4" />}
                    {status.msg}
                </div>
            )}

            {/* Avatar */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-center gap-5">
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="w-20 h-20 rounded-full bg-secondary border-2 border-border flex items-center justify-center text-2xl font-bold text-muted-foreground cursor-pointer relative overflow-hidden shrink-0 group"
                    >
                        {profile.profilePictureUrl ? (
                            <img src={profile.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            getInitial(profile.fullName)
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                        {/* Uploading overlay */}
                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="px-3.5 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Change Photo'}
                            </button>
                            {profile.profilePictureUrl && (
                                <button
                                    onClick={handleRemoveAvatar}
                                    disabled={uploading}
                                    className="px-3.5 py-2 rounded-lg border border-destructive/30 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">JPG, PNG, or WebP. Max 5 MB.</p>
                    </div>
                    <input
                        ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange} className="hidden"
                    />
                </div>
            </div>

            {/* Basic Info */}
            <FormSection icon={<User className="w-4 h-4 text-primary" />} title="Basic Info">
                <Field icon={<User className="w-3.5 h-3.5" />} label="Full Name" value={profile.fullName} onChange={v => updateField('fullName', v)} />
                <Field icon={<AtSign className="w-3.5 h-3.5" />} label="Username" value={profile.username || ''} onChange={v => updateField('username', v)} placeholder="@username" />
                <Field icon={<FileText className="w-3.5 h-3.5" />} label="Bio" value={profile.description || ''} onChange={v => updateField('description', v)} multiline />
            </FormSection>

            {/* Cricket Info */}
            <FormSection icon={<Shield className="w-4 h-4 text-primary" />} title="Cricket Info">
                <SelectField icon={<Shield className="w-3.5 h-3.5" />} label="Playing Role" value={profile.role || ''} onChange={v => updateField('role', v || null)} options={ROLE_OPTIONS} />
                <SelectField icon={<Hand className="w-3.5 h-3.5" />} label="Batting Hand" value={profile.battingHand || ''} onChange={v => updateField('battingHand', v || null)} options={BATTING_OPTIONS} />
                <SelectField icon={<Target className="w-3.5 h-3.5" />} label="Bowling Style" value={profile.bowlingStyle || ''} onChange={v => updateField('bowlingStyle', v || null)} options={BOWLING_OPTIONS} />
                <Field icon={<Hash className="w-3.5 h-3.5" />} label="Jersey Number" type="number" value={profile.jerseyNumber?.toString() || ''} onChange={v => updateField('jerseyNumber', v ? parseInt(v) : null)} />
            </FormSection>

            {/* Location */}
            <FormSection icon={<MapPin className="w-4 h-4 text-primary" />} title="Location">
                <Field icon={<MapPin className="w-3.5 h-3.5" />} label="City" value={profile.city || ''} onChange={v => updateField('city', v || null)} />
                <Field icon={<MapPin className="w-3.5 h-3.5" />} label="State" value={profile.state || ''} onChange={v => updateField('state', v || null)} />
            </FormSection>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20 disabled:opacity-50"
            >
                {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <Save className="w-4 h-4" />
                        Save Changes
                    </>
                )}
            </button>
        </Container>
    );
};

// ─── Sub-Components ───

const FormSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
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

const Field = ({
    icon, label, value, onChange, placeholder, multiline, type = 'text',
}: {
    icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; multiline?: boolean; type?: string;
}) => (
    <div className="px-4 py-3 border-b border-border last:border-b-0">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
            {icon}
            {label}
        </label>
        {multiline ? (
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-vertical focus:outline-none"
            />
        ) : (
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
        )}
    </div>
);

const SelectField = ({
    icon, label, value, onChange, options,
}: {
    icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) => (
    <div className="px-4 py-3 border-b border-border last:border-b-0">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
            {icon}
            {label}
        </label>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground cursor-pointer focus:outline-none appearance-none"
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

const LoadingSkeleton = () => (
    <Container className="py-6 space-y-4">
        <div className="w-20 h-20 rounded-full bg-secondary animate-pulse mx-auto" />
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
        ))}
    </Container>
);

// ─── Option Constants ───

const ROLE_OPTIONS = [
    { value: '', label: 'Select role...' },
    { value: 'BATSMAN', label: 'Batsman' },
    { value: 'BOWLER', label: 'Bowler' },
    { value: 'ALL_ROUNDER', label: 'All-Rounder' },
    { value: 'WICKET_KEEPER_BATSMAN', label: 'Wicket-Keeper Batsman' },
];

const BATTING_OPTIONS = [
    { value: '', label: 'Select...' },
    { value: 'RIGHT_HANDED', label: 'Right Handed' },
    { value: 'LEFT_HANDED', label: 'Left Handed' },
];

const BOWLING_OPTIONS = [
    { value: '', label: 'Select...' },
    { value: 'RIGHT_ARM_FAST', label: 'Right Arm Fast' },
    { value: 'RIGHT_ARM_MEDIUM', label: 'Right Arm Medium' },
    { value: 'LEFT_ARM_FAST', label: 'Left Arm Fast' },
    { value: 'LEFT_ARM_MEDIUM', label: 'Left Arm Medium' },
    { value: 'RIGHT_ARM_SPIN', label: 'Right Arm Spin' },
    { value: 'LEFT_ARM_SPIN', label: 'Left Arm Spin' },
];
