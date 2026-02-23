import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { Loader2, UserPlus } from 'lucide-react';
import type { TournamentDetail } from '../tournamentAdminService';

interface TeamRegistrationProps {
    tournament: TournamentDetail;
    onRegisterTeam: (tournamentId: string, teamId: string) => Promise<void>;
}

/**
 * TeamRegistration — Register a team + display registered teams.
 *
 * Rules:
 * - Disable register button if maxTeams reached
 * - Backend enforces role check (owner/captain)
 * - Refetch detail after successful registration (handled by store)
 */
export const TeamRegistration: React.FC<TeamRegistrationProps> = React.memo(({
    tournament,
    onRegisterTeam,
}) => {
    const [teamId, setTeamId] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const isMaxReached = (tournament.teams?.length ?? 0) >= tournament.maxTeams;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamId.trim() || isRegistering || isMaxReached) return;

        setIsRegistering(true);
        setError(null);
        setSuccess(false);

        try {
            await onRegisterTeam(tournament.id, teamId.trim());
            setTeamId('');
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message || 'Failed to register team');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <Card padding="md">
            <h3 className={typography.headingMd}>
                Teams ({tournament.teams?.length ?? 0}/{tournament.maxTeams})
            </h3>

            {/* Register form */}
            {!isMaxReached && (
                <form onSubmit={handleRegister} className="flex items-center gap-2 mt-3 mb-4">
                    <input
                        type="text"
                        value={teamId}
                        onChange={e => setTeamId(e.target.value)}
                        placeholder="Team ID"
                        className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm
                                   focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    />
                    <button
                        type="submit"
                        disabled={!teamId.trim() || isRegistering}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg
                                   text-sm font-medium hover:bg-brand/90 transition-colors
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isRegistering ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                        )}
                        Register
                    </button>
                </form>
            )}

            {isMaxReached && (
                <p className="text-xs text-amber-600 mt-2 mb-3 font-medium">
                    Maximum teams reached ({tournament.maxTeams}).
                </p>
            )}

            {error && <p className="text-xs text-danger mb-3">{error}</p>}
            {success && <p className="text-xs text-green-600 mb-3">Team registered successfully.</p>}

            {/* Team list */}
            {tournament.teams && tournament.teams.length > 0 ? (
                <div className="space-y-1.5">
                    {tournament.teams.map((t, i) => (
                        <div
                            key={t.id}
                            className="flex items-center gap-3 px-3 py-2 bg-surface rounded-lg border border-border/50"
                        >
                            <span className="text-xs text-textSecondary w-5 tabular-nums">{i + 1}</span>
                            <span className="text-sm font-medium text-textPrimary">{t.team.name}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-sm text-textSecondary">No teams registered yet.</p>
                </div>
            )}
        </Card>
    );
});

TeamRegistration.displayName = 'TeamRegistration';
