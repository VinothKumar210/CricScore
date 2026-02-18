import { clsx } from 'clsx';

type BadgeStatus = 'live' | 'completed' | 'scheduled' | 'abandoned';

interface StateBadgeProps {
    status: BadgeStatus;
    className?: string;
}

const statusStyles: Record<BadgeStatus, string> = {
    live: 'bg-danger/10 text-danger',
    completed: 'bg-success/10 text-success',
    scheduled: 'bg-warning/10 text-warning',
    abandoned: 'bg-gray-200 text-gray-600',
};

const statusLabels: Record<BadgeStatus, string> = {
    live: 'Live',
    completed: 'Completed',
    scheduled: 'Scheduled',
    abandoned: 'Abandoned',
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
            {status === 'live' && (
                <span className="w-1.5 h-1.5 rounded-full bg-danger mr-1.5 animate-pulse" />
            )}
            {statusLabels[status]}
        </span>
    );
};
