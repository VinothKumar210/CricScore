import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import type { HubMatchItem, HubScore } from '../types';

interface HubMatchCardProps {
    match: HubMatchItem;
}

/**
 * HubMatchCard — metadata-only match card for the Live Hub.
 *
 * PERFORMANCE CONTRACT:
 * - No engine calls
 * - No bundle creation
 * - No derived computations
 * - Renders from pre-fetched metadata only
 */
export const HubMatchCard: React.FC<HubMatchCardProps> = React.memo(({ match }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (match.status === 'LIVE') {
            // Navigate to spectator live mode
            navigate(`/live/${match.id}`);
        } else {
            // Navigate to match detail
            navigate(`/match/${match.id}`);
        }
    };

    const teamInitial = (name: string, shortName?: string) =>
        shortName?.[0] || name[0];

    const formatScore = (score?: HubScore) => {
        if (!score) return null;
        return (
            <div className="flex flex-col items-end">
                <span className="font-bold text-foreground tabular-nums">
                    {score.runs}/{score.wickets}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                    ({score.overs})
                </span>
            </div>
        );
    };

    const statusColor: Record<string, string> = {
        LIVE: 'bg-destructive/100',
        SCHEDULED: 'bg-chart-1/100',
        COMPLETED: 'bg-green-600',
        ABANDONED: 'bg-background0',
        INNINGS_BREAK: 'bg-amber-500',
    };

    return (
        <Card
            className="cursor-pointer active:scale-[0.99] transition-transform"
            padding="md"
            hover
            onClick={handleClick}
        >
            {/* Header: Tournament + Status */}
            <div className="flex justify-between items-start mb-3">
                <span className={clsx(typography.caption, 'uppercase tracking-wide font-medium truncate max-w-[70%]')}>
                    {match.tournamentName || 'Friendly Match'}
                </span>
                <span className={clsx(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white',
                    statusColor[match.status] || 'bg-gray-400'
                )}>
                    {match.status === 'INNINGS_BREAK' ? 'Break' : match.status}
                    {match.status === 'LIVE' && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-card animate-pulse" />
                    )}
                </span>
            </div>

            {/* Team A */}
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {teamInitial(match.homeTeamName, match.homeTeam?.shortName)}
                    </div>
                    <span className={clsx(typography.bodyMd, 'font-medium')}>
                        {match.homeTeamName}
                    </span>
                </div>
                {formatScore(match.scoreA)}
            </div>

            {/* Team B */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {teamInitial(match.awayTeamName, match.awayTeam?.shortName)}
                    </div>
                    <span className={clsx(typography.bodyMd, 'font-medium')}>
                        {match.awayTeamName}
                    </span>
                </div>
                {formatScore(match.scoreB)}
            </div>

            {/* Footer: Result or Match Date */}
            <div className="mt-3 pt-3 border-t border-border">
                <p className={clsx(typography.caption, 'text-center')}>
                    {match.result || formatMatchDate(match.matchDate, match.status)}
                </p>
            </div>
        </Card>
    );
});

HubMatchCard.displayName = 'HubMatchCard';

function formatMatchDate(dateStr: string, status: string): string {
    if (status === 'LIVE') return '🔴 Live Now';
    if (status === 'INNINGS_BREAK') return '⏸ Innings Break';

    const date = new Date(dateStr);
    return `Starts ${date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })}`;
}
