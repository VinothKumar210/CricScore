import { StateBadge } from '../../../components/ui/StateBadge';
import type { MatchDetail, ScoreSummary } from '../types/domainTypes';
import { clsx } from 'clsx';
import { Calendar } from 'lucide-react';

interface MatchHeaderProps {
    match: MatchDetail;
}

/**
 * MatchHeader — Premium cricket-style header.
 *
 * Layout:
 * ┌────────────────────────────────────────────┐
 * │  Tournament Name               StateBadge  │
 * │                                            │
 * │  [A]  Team A       Score A                 │
 * │       ────────────────────                 │
 * │  [B]  Team B       Score B                 │
 * │                                            │
 * │  Result / Status text                      │
 * │  Date  •  Venue                            │
 * └────────────────────────────────────────────┘
 */
export const MatchHeader: React.FC<MatchHeaderProps> = ({ match }) => {
    const getInitials = (name: string) => {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    };

    const formatScore = (score?: ScoreSummary) => {
        if (!score) return <span className="text-muted-foreground">—</span>;
        return (
            <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums">{score.runs}/{score.wickets}</span>
                <span className="text-xs text-muted-foreground font-medium">({score.overs})</span>
            </div>
        );
    };

    const getStatusText = () => {
        if (match.status === 'COMPLETED') return match.result || 'Match Completed';
        if (match.status === 'SCHEDULED') {
            return `Starts ${new Date(match.startTime).toLocaleString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            })}`;
        }
        return null;
    };

    const statusText = getStatusText();

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {/* Top bar: Tournament + Badge */}
            <div className="flex justify-between items-center px-5 pt-4 pb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                    {match.tournamentName || "Friendly Match"}
                </span>
                <StateBadge status={match.status} />
            </div>

            {/* Team rows */}
            <div className="px-5 py-3 space-y-3">
                {/* Team A */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {match.teamA.shortName || getInitials(match.teamA.name)}
                        </div>
                        <span className="font-semibold text-foreground">{match.teamA.name}</span>
                    </div>
                    <div className="text-right">
                        {formatScore(match.scoreA)}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Team B */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {match.teamB.shortName || getInitials(match.teamB.name)}
                        </div>
                        <span className="font-semibold text-foreground">{match.teamB.name}</span>
                    </div>
                    <div className="text-right">
                        {formatScore(match.scoreB)}
                    </div>
                </div>
            </div>

            {/* Result / Status footer */}
            <div className="px-5 py-3 border-t border-border bg-secondary/30">
                {statusText && (
                    <p className={clsx(
                        "text-sm font-medium text-center",
                        match.status === 'COMPLETED' ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {statusText}
                    </p>
                )}
                <div className="flex items-center justify-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(match.startTime).toLocaleDateString(undefined, {
                            day: 'numeric', month: 'short', year: 'numeric'
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
};
