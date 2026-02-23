import React from 'react';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import type { ScrubbedMatch } from '../types';

interface ShareScoreCardProps {
    match: ScrubbedMatch;
}

/**
 * ShareScoreCard — Read-only score display from scrubbed data.
 * No engine calls, no bundle, no team/user IDs.
 */
export const ShareScoreCard: React.FC<ShareScoreCardProps> = React.memo(({ match }) => {
    const statusColor: Record<string, string> = {
        LIVE: 'bg-red-500',
        SCHEDULED: 'bg-blue-500',
        COMPLETED: 'bg-green-600',
        ABANDONED: 'bg-gray-500',
        INNINGS_BREAK: 'bg-amber-500',
    };

    const statusLabel = match.status === 'INNINGS_BREAK' ? 'Break' : match.status;

    return (
        <Card padding="lg" className="relative overflow-hidden">
            {/* Status Banner */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className={clsx(typography.caption, 'uppercase tracking-wider font-medium mb-1')}>
                        {match.venue || 'Cricket Match'}
                    </p>
                    <p className="text-xs text-textSecondary">
                        {new Date(match.matchDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        })}
                        {match.overs ? ` · ${match.overs} overs` : ''}
                    </p>
                </div>
                <span className={clsx(
                    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white',
                    statusColor[match.status] || 'bg-gray-400'
                )}>
                    {statusLabel}
                </span>
            </div>

            {/* Teams */}
            <div className="space-y-3">
                <TeamRow
                    name={match.homeTeamName}
                    shortName={match.homeTeam?.shortName}
                    logoUrl={match.homeTeam?.logoUrl}
                    isWinner={match.winningTeamName === match.homeTeamName}
                />
                <div className="flex items-center gap-3 px-10">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-bold text-textSecondary">VS</span>
                    <div className="flex-1 h-px bg-border" />
                </div>
                <TeamRow
                    name={match.awayTeamName}
                    shortName={match.awayTeam?.shortName}
                    logoUrl={match.awayTeam?.logoUrl}
                    isWinner={match.winningTeamName === match.awayTeamName}
                />
            </div>

            {/* Result */}
            {match.result && (
                <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-center text-sm font-semibold text-brand">
                        {match.result}
                    </p>
                    {match.winMargin && (
                        <p className="text-center text-xs text-textSecondary mt-0.5">
                            {match.winMargin}
                        </p>
                    )}
                </div>
            )}
        </Card>
    );
});

ShareScoreCard.displayName = 'ShareScoreCard';

// ─── Helper ───

const TeamRow: React.FC<{
    name: string;
    shortName?: string;
    logoUrl?: string;
    isWinner: boolean;
}> = ({ name, shortName, isWinner }) => (
    <div className={clsx(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        isWinner ? 'bg-green-50 border border-green-200' : 'bg-surface'
    )}>
        <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center
                        text-sm font-bold text-textSecondary shadow-sm">
            {shortName?.[0] || name[0]}
        </div>
        <div className="flex-1">
            <span className={clsx(
                'font-semibold text-sm',
                isWinner ? 'text-green-800' : 'text-textPrimary'
            )}>
                {name}
            </span>
            {isWinner && (
                <span className="ml-2 text-xs text-green-600 font-medium">✓ Winner</span>
            )}
        </div>
    </div>
);
