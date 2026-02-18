import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { StateBadge } from '../../../components/ui/StateBadge';
import { MatchFeedItem, ScoreSummary } from '../types';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';

interface MatchCardProps {
    match: MatchFeedItem;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/match/${match.id}`);
    };

    const formatScore = (score?: ScoreSummary) => {
        if (!score) return null;
        return (
            <div className="flex flex-col items-end">
                <span className="font-bold text-textPrimary">
                    {score.runs}/{score.wickets}
                </span>
                <span className="text-xs text-textSecondary">
                    ({score.overs})
                </span>
            </div>
        );
    };

    return (
        <Card
            className="cursor-pointer active:scale-[0.99] transition-transform"
            padding="md"
            hover
            onClick={handleClick}
        >
            <div>
                {/* Header: Tournament + Status */}
                <div className="flex justify-between items-start mb-3">
                    <span className={clsx(typography.caption, "uppercase tracking-wide font-medium truncate max-w-[70%]")}>
                        {match.tournamentName || "Friendly Match"}
                    </span>
                    <StateBadge status={match.status} />
                </div>

                {/* Teams & Scores */}
                <div className="space-y-2">
                    {/* Team A */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {/* Placeholder Logo */}
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-textSecondary">
                                {match.teamA.shortName?.[0] || match.teamA.name[0]}
                            </div>
                            <span className={clsx(typography.bodyMd, "font-medium")}>
                                {match.teamA.name}
                            </span>
                        </div>
                        {formatScore(match.scoreA)}
                    </div>

                    {/* Team B */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {/* Placeholder Logo */}
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-textSecondary">
                                {match.teamB.shortName?.[0] || match.teamB.name[0]}
                            </div>
                            <span className={clsx(typography.bodyMd, "font-medium")}>
                                {match.teamB.name}
                            </span>
                        </div>
                        {formatScore(match.scoreB)}
                    </div>
                </div>

                {/* Footer: Result or Start Time */}
                <div className="mt-3 pt-3 border-t border-border">
                    <p className={clsx(typography.caption, "text-center")}>
                        {match.result || `Starts ${new Date(match.startTime).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}`}
                    </p>
                </div>
            </div>
        </Card>
    );
};
