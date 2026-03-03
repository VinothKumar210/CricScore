import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { api } from '../../lib/api';
import { useTeamStore } from '../../features/teams/teamStore';
import {
    Plus, Users, Shield, MapPin, Loader2, QrCode,
    ArrowRight, Search, UserPlus
} from 'lucide-react';
import { clsx } from 'clsx';

interface TeamCard {
    id: string;
    name: string;
    shortName?: string;
    city?: string;
    _count?: { members: number };
    matchesConfirmed?: number;
    matchesCancelled?: number;
}

/**
 * TeamsPage — List of user's teams with premium cards.
 * Features:
 * - Team cards with initial avatar, name, city, member count, reliability bar
 * - Create Team + Join Team CTAs
 * - Search/filter
 */
export const TeamsPage = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState<TeamCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const joinByCode = useTeamStore((s) => s.joinByCode);

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            const res = await api.get('/api/teams');
            setTeams(res.data?.teams || res.teams || []);
        } catch {
            // Silently fail
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!joinCode.trim()) return;
        setIsJoining(true);
        setJoinError('');
        try {
            await joinByCode(joinCode.trim());
            setShowJoinModal(false);
            setJoinCode('');
            loadTeams(); // Refresh
        } catch (err: any) {
            setJoinError(err.message || 'Invalid code');
        } finally {
            setIsJoining(false);
        }
    };

    const getInitials = (name: string) =>
        name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const getReliability = (confirmed: number = 0, cancelled: number = 0) => {
        if (confirmed === 0) return 100;
        return Math.round(((confirmed - cancelled) / confirmed) * 100);
    };

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Container className="py-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Teams</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {teams.length} team{teams.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="p-2.5 rounded-xl bg-secondary border border-border hover:bg-card transition-colors"
                        title="Join Team"
                    >
                        <UserPlus className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <button
                        onClick={() => navigate('/teams/create')}
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
                        title="Create Team"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Search */}
            {teams.length > 3 && (
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search teams..."
                            className="w-full h-10 rounded-xl bg-secondary border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                    </div>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading teams...</span>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && teams.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-9 h-9 text-primary" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-foreground">No Teams Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                            Create your first team or join one using an invite code
                        </p>
                    </div>
                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                        >
                            <QrCode className="w-4 h-4" />
                            Join Team
                        </button>
                        <button
                            onClick={() => navigate('/teams/create')}
                            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Team
                        </button>
                    </div>
                </div>
            )}

            {/* Team Cards */}
            {!isLoading && filteredTeams.length > 0 && (
                <div className="space-y-3">
                    {filteredTeams.map(team => {
                        const reliability = getReliability(team.matchesConfirmed, team.matchesCancelled);
                        const memberCount = team._count?.members ?? 0;

                        return (
                            <Link
                                key={team.id}
                                to={`/teams/${team.id}`}
                                className="block bg-card rounded-xl border border-border p-4 shadow-sm hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                                        {team.shortName || getInitials(team.name)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-foreground truncate">{team.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            {team.city && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {team.city}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {memberCount} members
                                            </span>
                                        </div>

                                        {/* Reliability bar */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full rounded-full transition-all",
                                                        reliability >= 80 ? "bg-emerald-500"
                                                            : reliability >= 50 ? "bg-amber-500"
                                                                : "bg-destructive"
                                                    )}
                                                    style={{ width: `${reliability}%` }}
                                                />
                                            </div>
                                            <span className={clsx(
                                                "text-[10px] font-semibold tabular-nums",
                                                reliability >= 80 ? "text-emerald-400"
                                                    : reliability >= 50 ? "text-amber-400"
                                                        : "text-destructive"
                                            )}>
                                                {reliability}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Join Modal */}
            {showJoinModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowJoinModal(false)} />
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 border-t border-border">
                        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

                        <div className="text-center mb-5">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                <QrCode className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Join a Team</h3>
                            <p className="text-sm text-muted-foreground mt-1">Enter the invite code or scan QR</p>
                        </div>

                        <input
                            type="text"
                            value={joinCode}
                            onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
                            placeholder="Enter invite code"
                            className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground text-center text-lg font-mono tracking-widest placeholder:text-muted-foreground placeholder:text-sm placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-3"
                            autoFocus
                        />

                        {joinError && (
                            <p className="text-destructive text-sm text-center mb-3">{joinError}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowJoinModal(false)}
                                className="flex-1 h-12 rounded-xl border border-border font-semibold text-foreground bg-card hover:bg-secondary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoin}
                                disabled={isJoining || !joinCode.trim()}
                                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 disabled:opacity-50"
                            >
                                {isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </Container>
    );
};
