import React from 'react';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import type { TournamentDetail } from '../tournamentAdminService';

interface TournamentHeaderProps {
    tournament: TournamentDetail;
}

/**
 * TournamentHeader — Detail page header (metadata + status).
 * No engine computation.
 */
export const TournamentHeader: React.FC<TournamentHeaderProps> = React.memo(({ tournament }) => {
    const statusColor: Record<string, string> = {
        UPCOMING: 'bg-blue-100 text-blue-700',
        IN_PROGRESS: 'bg-amber-100 text-amber-700',
        COMPLETED: 'bg-green-100 text-green-700',
    };

    const badge = statusColor[tournament.status] || 'bg-gray-100 text-gray-700';

    return (
        <Card padding="lg">
            <div className="flex items-center justify-between mb-3">
                <h1 className={typography.headingLg}>{tournament.name}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badge}`}>
                    {tournament.status?.replace('_', ' ')}
                </span>
            </div>

            {tournament.description && (
                <p className="text-sm text-textSecondary mb-3">{tournament.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-textSecondary flex-wrap">
                <span>{tournament.format?.replace('_', ' ')}</span>
                <span>·</span>
                <span>{tournament.overs} overs</span>
                <span>·</span>
                <span>{tournament.teams?.length ?? 0}/{tournament.maxTeams} teams</span>
                <span>·</span>
                <span>
                    Starts {new Date(tournament.startDate).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                    })}
                </span>
                {tournament.ballType && (
                    <>
                        <span>·</span>
                        <span>{tournament.ballType} ball</span>
                    </>
                )}
            </div>
        </Card>
    );
});

TournamentHeader.displayName = 'TournamentHeader';
