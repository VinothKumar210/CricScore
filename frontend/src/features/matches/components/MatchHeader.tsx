import { Card } from '../../../components/ui/Card';
import { StateBadge } from '../../../components/ui/StateBadge';
import type { MatchDetail, ScoreSummary } from '../types/domainTypes';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';

interface MatchHeaderProps {
    match: MatchDetail;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({ match }) => {

    const formatScore = (score?: ScoreSummary) => {
        if (!score) return <span className="text-muted-foreground">-</span>;
        return (
            <div className="flex flex-col">
                <span className={clsx(typography.headingLg, "font-bold tabular-nums")}>
                    {score.runs}/{score.wickets}
                </span>
                <span className={clsx(typography.caption, "text-muted-foreground")}>
                    ({score.overs})
                </span>
            </div>
        );
    };

    const getStatusText = () => {
        if (match.status === 'COMPLETED') {
            return match.result || 'Match Completed';
        }
        if (match.status === 'SCHEDULED') {
            return `Starts ${new Date(match.startTime).toLocaleString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            })}`;
        }
        return 'Live'; // Or allow StateBadge to handle visual status
    };

    return (
        <Card padding="lg" className="bg-card">
            {/* Header Row */}
            <div className="flex justify-between items-center mb-6">
                <span className={clsx(typography.caption, "uppercase tracking-wider font-semibold")}>
                    {match.tournamentName || "Friendly Match"}
                </span>
                <StateBadge status={match.status} />
            </div>

            {/* Teams & Scores Row */}
            <div className="flex justify-between items-center">
                {/* Team A */}
                <div className="flex-1 text-left">
                    <div className="mb-1">
                        <span className={clsx(typography.headingMd, "block")}>{match.teamA.name}</span>
                    </div>
                    {formatScore(match.scoreA)}
                </div>

                {/* VS / Divider */}
                <div className="mx-4 text-muted-foreground text-xs font-bold bg-card rounded-full w-8 h-8 flex items-center justify-center">
                    VS
                </div>

                {/* Team B */}
                <div className="flex-1 text-right items-end flex flex-col">
                    <div className="mb-1">
                        <span className={clsx(typography.headingMd, "block")}>{match.teamB.name}</span>
                    </div>
                    {formatScore(match.scoreB)}
                </div>
            </div>

            {/* Footer / Status Text */}
            <div className="mt-6 pt-4 border-t border-border text-center">
                <p className={clsx(typography.bodyMd, "font-medium text-muted-foreground")}>
                    {getStatusText()}
                </p>
            </div>
        </Card>
    );
};
