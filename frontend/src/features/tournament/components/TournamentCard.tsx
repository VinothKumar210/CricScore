import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Calendar, Users, Clock, ArrowRight } from 'lucide-react';
import type { TournamentMeta } from '../tournamentAdminService';

interface TournamentCardProps {
    tournament: TournamentMeta;
}

const STATUS_BADGES: Record<string, string> = {
    UPCOMING: 'bg-primary/10 text-primary border-primary/20',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

/**
 * TournamentCard — Metadata-only card for tournament list.
 */
export const TournamentCard: React.FC<TournamentCardProps> = React.memo(({ tournament }) => {
    const navigate = useNavigate();
    const badge = STATUS_BADGES[tournament.status] || 'bg-secondary text-muted-foreground border-border';

    return (
        <div
            onClick={() => navigate(`/tournaments/${tournament.id}`)}
            className="bg-card rounded-xl border border-border p-4 shadow-sm cursor-pointer
                       hover:border-primary/20 hover:shadow-md hover:shadow-primary/5
                       active:scale-[0.99] transition-all"
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground truncate">{tournament.name}</h3>
                <span className={clsx(
                    'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ml-2',
                    badge
                )}>
                    {tournament.status?.replace('_', ' ')}
                </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    {tournament.format?.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    {tournament.overs} overs
                </span>
                <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-primary" />
                    {tournament._count?.teams ?? 0}/{tournament.maxTeams}
                </span>
            </div>

            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Starts {new Date(tournament.startDate).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                    })}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
        </div>
    );
});

TournamentCard.displayName = 'TournamentCard';
