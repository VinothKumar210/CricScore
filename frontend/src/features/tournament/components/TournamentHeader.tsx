import React from 'react';
import { clsx } from 'clsx';
import { Calendar, Users, Clock, CircleDot } from 'lucide-react';
import type { TournamentDetail } from '../tournamentAdminService';

interface TournamentHeaderProps {
    tournament: TournamentDetail;
}

const STATUS_BADGES: Record<string, string> = {
    UPCOMING: 'bg-primary/10 text-primary border-primary/20',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

/**
 * TournamentHeader — Detail page header (metadata + status).
 */
export const TournamentHeader: React.FC<TournamentHeaderProps> = React.memo(({ tournament }) => {
    const badge = STATUS_BADGES[tournament.status] || 'bg-secondary text-muted-foreground border-border';

    return (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold tracking-tight text-foreground">{tournament.name}</h1>
                <span className={clsx(
                    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border shrink-0 ml-2',
                    badge
                )}>
                    {tournament.status?.replace('_', ' ')}
                </span>
            </div>

            {tournament.description && (
                <p className="text-sm text-muted-foreground mb-3">{tournament.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                    <CircleDot className="w-3 h-3 text-primary" />
                    {tournament.format?.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                    <Clock className="w-3 h-3 text-primary" />
                    {tournament.overs} overs
                </span>
                <span className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                    <Users className="w-3 h-3 text-primary" />
                    {tournament.teams?.length ?? 0}/{tournament.maxTeams}
                </span>
                <span className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    {new Date(tournament.startDate).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                    })}
                </span>
                {tournament.ballType && (
                    <span className="bg-secondary rounded-lg px-2 py-1">
                        {tournament.ballType} ball
                    </span>
                )}
            </div>
        </div>
    );
});

TournamentHeader.displayName = 'TournamentHeader';
