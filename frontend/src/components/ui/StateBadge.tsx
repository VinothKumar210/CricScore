import { clsx } from 'clsx';
import { MatchStatus } from '../../features/matches/types';

interface StateBadgeProps {
    status: MatchStatus;
    className?: string;
}

const statusStyles: Record<MatchStatus, string> = {
    LIVE: 'bg-danger/10 text-danger',
    COMPLETED: 'bg-success/10 text-success',
    SCHEDULED: 'bg-warning/10 text-warning',
    ABANDONED: 'bg-textSecondary/20 text-textSecondary',
    INNINGS_BREAK: 'bg-warning/10 text-warning',
};

const statusLabels: Record<MatchStatus, string> = {
    LIVE: 'Live',
    COMPLETED: 'Completed',
    SCHEDULED: 'Scheduled',
    ABANDONED: 'Abandoned',
    INNINGS_BREAK: 'Innings Break',
};

export const StateBadge: React.FC<StateBadgeProps> = ({ status, className }) => {
    return (
        <span
            className={clsx(
                'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
                statusStyles[status],
                className
            )}
        >
            {status === 'LIVE' && (
                <span className="w-1.5 h-1.5 rounded-full bg-danger mr-1.5 animate-pulse" />
            )}
            {statusLabels[status]}
        </span>
    );
};
