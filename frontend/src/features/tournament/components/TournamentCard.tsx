import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import type { TournamentMeta } from '../tournamentAdminService';

interface TournamentCardProps {
    tournament: TournamentMeta;
}

/**
 * TournamentCard — Metadata-only card for tournament list.
 *
 * PERFORMANCE CONTRACT:
 * - No engine selectors
 * - No standings computation
 * - No NRR derivation
 * - Renders pre-computed metadata only
 */
export const TournamentCard: React.FC<TournamentCardProps> = React.memo(({ tournament }) => {
    const navigate = useNavigate();

    const statusColor: Record<string, string> = {
        UPCOMING: 'bg-blue-100 text-blue-700',
        IN_PROGRESS: 'bg-amber-100 text-amber-700',
        COMPLETED: 'bg-green-100 text-green-700',
    };

    const badge = statusColor[tournament.status] || 'bg-gray-100 text-gray-700';

    return (
        <Card
            className="cursor-pointer active:scale-[0.99] transition-transform"
            padding="md"
            hover
            onClick={() => navigate(`/tournaments/${tournament.id}`)}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className={clsx(typography.bodyMd, 'font-semibold')}>{tournament.name}</h3>
                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', badge)}>
                    {tournament.status?.replace('_', ' ')}
                </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-textSecondary">
                <span>{tournament.format?.replace('_', ' ')}</span>
                <span>·</span>
                <span>{tournament.overs} overs</span>
                <span>·</span>
                <span>{tournament._count?.teams ?? 0}/{tournament.maxTeams} teams</span>
            </div>

            <div className="mt-2 pt-2 border-t border-border/50">
                <span className="text-[10px] text-textSecondary">
                    Starts {new Date(tournament.startDate).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                    })}
                </span>
            </div>
        </Card>
    );
});

TournamentCard.displayName = 'TournamentCard';
