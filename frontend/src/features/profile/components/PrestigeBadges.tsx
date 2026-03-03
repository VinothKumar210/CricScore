import React from 'react';
import type { CareerStats } from '../profileService';

interface PrestigeBadgesProps {
    stats: CareerStats;
}

interface Badge {
    id: string;
    label: string;
    description: string;
    earned: boolean;
    iconBg: string;
    iconColor: string;
}

/**
 * PrestigeBadges — Achievement grid matching shadcn reference.
 * 2-column grid, icon in colored rounded box, hover:border-primary effect.
 */
export const PrestigeBadges: React.FC<PrestigeBadgesProps> = React.memo(({ stats }) => {
    const badges: Badge[] = [
        {
            id: 'centurion',
            label: 'Centurion',
            description: `${stats.hundreds} centuries`,
            earned: stats.hundreds > 0,
            iconBg: 'bg-amber-900/30',
            iconColor: 'text-amber-500',
        },
        {
            id: 'run_machine',
            label: 'Run Machine',
            description: `${stats.totalRuns}+ runs`,
            earned: stats.totalRuns >= 500,
            iconBg: 'bg-red-900/30',
            iconColor: 'text-red-500',
        },
        {
            id: 'fifer',
            label: 'Fifer',
            description: `${stats.fiveWicketHauls} five-fers`,
            earned: stats.fiveWicketHauls > 0,
            iconBg: 'bg-purple-900/30',
            iconColor: 'text-purple-400',
        },
        {
            id: 'fifty_maker',
            label: 'Fifty Maker',
            description: `${stats.fifties} half-centuries`,
            earned: stats.fifties > 0 || stats.hundreds > 0,
            iconBg: 'bg-blue-900/30',
            iconColor: 'text-blue-400',
        },
        {
            id: 'strike_force',
            label: 'Strike Force',
            description: `SR ${stats.strikeRate}`,
            earned: stats.strikeRate > 150,
            iconBg: 'bg-yellow-900/30',
            iconColor: 'text-yellow-500',
        },
        {
            id: 'economy_king',
            label: 'Economy King',
            description: `Eco ${stats.economy}`,
            earned: stats.economy > 0 && stats.economy < 6.0,
            iconBg: 'bg-emerald-900/30',
            iconColor: 'text-emerald-500',
        },
    ];

    const earned = badges.filter(b => b.earned);
    const locked = badges.filter(b => !b.earned);
    const allBadges = [...earned, ...locked];

    return (
        <div>
            <h3 className="font-semibold text-lg mb-4 pl-1">Achievements</h3>
            <div className="grid grid-cols-2 gap-3">
                {allBadges.map(badge => (
                    <div
                        key={badge.id}
                        className={`p-4 rounded-xl border border-border bg-card flex items-start gap-3 shadow-sm transition-colors cursor-pointer group ${badge.earned
                                ? 'hover:border-primary/50'
                                : 'opacity-40'
                            }`}
                        title={badge.description}
                    >
                        <div className={`p-2 rounded-lg ${badge.iconBg} ${badge.iconColor} group-hover:scale-110 transition-transform`}>
                            <BadgeIcon type={badge.id} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm">{badge.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {badge.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

PrestigeBadges.displayName = 'PrestigeBadges';

/** Simple SVG icons for badges — avoids emoji inconsistency */
function BadgeIcon({ type }: { type: string }) {
    const cls = "w-5 h-5";
    switch (type) {
        case 'centurion':
        case 'fifty_maker':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
            );
        case 'run_machine':
        case 'strike_force':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m13 2 2 2.5-2 2.5" /><path d="M10 21v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1" />
                    <path d="M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path d="M4 21v-1a4 4 0 0 1 4-4h0" />
                    <circle cx="8" cy="10" r="3" />
                </svg>
            );
        case 'fifer':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            );
        case 'economy_king':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            );
        default:
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
            );
    }
}
