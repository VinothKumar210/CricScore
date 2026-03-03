import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { useTeamStore } from '../../features/teams/teamStore';
import { teamService } from '../../features/teams/teamService';
import type { TeamMember } from '../../features/teams/teamService';
import {
    ChevronLeft, Loader2, Shield, MapPin, Users, Copy, Check,
    Crown, UserMinus, MoreVertical, QrCode, Trash2, Settings
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * TeamDetailPage — Full team view.
 *
 * Sections:
 * - Header: team avatar, name, city, reliability, invite code
 * - QR Code card
 * - Members list with role badges and actions
 * - Danger zone (delete)
 */
export const TeamDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { team, isLoading, error, fetchTeam, removeMember, deleteTeam } = useTeamStore();
    const [copiedCode, setCopiedCode] = useState(false);
    const [qrData, setQrData] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [actionMemberId, setActionMemberId] = useState<string | null>(null);

    useEffect(() => {
        if (id) fetchTeam(id);
    }, [id, fetchTeam]);

    const copyCode = async () => {
        if (!team?.inviteCode) return;
        try {
            await navigator.clipboard.writeText(team.inviteCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        } catch { /* fallback */ }
    };

    const loadQR = async () => {
        if (!id || qrData) return;
        setQrLoading(true);
        try {
            const res = await teamService.getQRCode(id);
            setQrData(res.qrCode);
        } catch { /* silent */ }
        setQrLoading(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!id) return;
        if (!confirm('Remove this member?')) return;
        await removeMember(id, memberId);
        setActionMemberId(null);
    };

    const handleDelete = async () => {
        if (!id) return;
        if (!confirm('Delete this team permanently? This cannot be undone.')) return;
        await deleteTeam(id);
        navigate('/teams');
    };

    const getInitials = (name: string) =>
        name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const getRoleBadge = (role: string) => {
        const styles: Record<string, string> = {
            OWNER: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
            CAPTAIN: 'bg-primary/15 text-primary border-primary/30',
            VICE_CAPTAIN: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            PLAYER: 'bg-secondary text-muted-foreground border-border',
        };
        return styles[role] || styles.PLAYER;
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            OWNER: 'Owner',
            CAPTAIN: 'Captain',
            VICE_CAPTAIN: 'Vice Capt.',
            PLAYER: 'Player',
        };
        return labels[role] || role;
    };

    // Loading
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-3">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Loading team...</span>
            </div>
        );
    }

    // Error
    if (error || !team) {
        return (
            <Container className="py-6">
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Shield className="w-7 h-7 text-destructive" />
                    </div>
                    <p className="text-foreground font-semibold">{error || 'Team not found'}</p>
                    <button
                        onClick={() => navigate('/teams')}
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                    >
                        Back to Teams
                    </button>
                </div>
            </Container>
        );
    }

    const memberList = team.members || [];

    return (
        <Container className="py-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/teams')}
                    className="p-2 rounded-lg bg-secondary border border-border hover:bg-card transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold tracking-tight truncate">{team.name}</h1>
                    <p className="text-sm text-muted-foreground">{memberList.length} members</p>
                </div>
                <button className="p-2 rounded-lg bg-secondary border border-border hover:bg-card transition-colors">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Team Card */}
            <div className="bg-card rounded-xl border border-border p-5 mb-4 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-primary mx-auto mb-3">
                    {team.shortName || getInitials(team.name)}
                </div>
                <h2 className="text-lg font-bold text-foreground">{team.name}</h2>
                {team.city && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {team.city}
                    </p>
                )}

                {/* Stats Row */}
                <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-border">
                    <div className="text-center">
                        <span className="text-xl font-bold tabular-nums text-foreground">{memberList.length}</span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Members</p>
                    </div>
                    <div className="text-center">
                        <span className={clsx(
                            "text-xl font-bold tabular-nums",
                            team.reliability >= 80 ? "text-emerald-400"
                                : team.reliability >= 50 ? "text-amber-400"
                                    : "text-destructive"
                        )}>
                            {team.reliability}%
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reliability</p>
                    </div>
                    <div className="text-center">
                        <span className="text-xl font-bold tabular-nums text-foreground">{team.matchesConfirmed}</span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Matches</p>
                    </div>
                </div>
            </div>

            {/* Invite Code */}
            <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Invite Code</span>
                        <p className="text-lg font-mono font-bold tracking-widest text-foreground mt-0.5">{team.inviteCode}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={copyCode}
                            className="p-2.5 rounded-lg bg-secondary border border-border hover:bg-card transition-colors"
                        >
                            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button
                            onClick={loadQR}
                            className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                            {qrLoading ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <QrCode className="w-4 h-4 text-primary" />}
                        </button>
                    </div>
                </div>

                {/* QR Code */}
                {qrData && (
                    <div className="mt-4 pt-4 border-t border-border flex justify-center">
                        <img src={qrData} alt="Team QR Code" className="w-48 h-48 bg-white rounded-xl p-2" />
                    </div>
                )}
            </div>

            {/* Members */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm mb-4">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Squad</h3>
                </div>
                <div className="divide-y divide-border">
                    {memberList.map((member: TeamMember) => (
                        <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                {member.user.profilePictureUrl ? (
                                    <img src={member.user.profilePictureUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    getInitials(member.user.fullName)
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground truncate">{member.user.fullName}</span>
                                    {member.role === 'OWNER' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                </div>
                                {member.user.role && (
                                    <span className="text-[10px] text-muted-foreground">{member.user.role}</span>
                                )}
                            </div>

                            {/* Role Badge */}
                            <span className={clsx(
                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                getRoleBadge(member.role)
                            )}>
                                {getRoleLabel(member.role)}
                            </span>

                            {/* Actions */}
                            <button
                                onClick={() => setActionMemberId(actionMemberId === member.id ? null : member.id)}
                                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                            >
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>

                            {/* Action Menu */}
                            {actionMemberId === member.id && (
                                <div className="absolute right-8 mt-16 bg-card rounded-lg border border-border shadow-xl z-10 py-1 min-w-[140px]">
                                    {member.role !== 'OWNER' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                            Remove
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-card rounded-xl border border-destructive/20 p-4">
                <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
                <p className="text-xs text-muted-foreground mb-3">Permanently delete this team and all its data.</p>
                <button
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete Team
                </button>
            </div>
        </Container>
    );
};
