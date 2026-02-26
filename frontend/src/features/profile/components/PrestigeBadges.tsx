import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { CareerStats } from '../profileService';

interface PrestigeBadgesProps {
    stats: CareerStats;
}

interface Badge {
    id: string;
    icon: string;
    label: string;
    description: string;
    earned: boolean;
    color: string;
}

/**
 * PrestigeBadges — Achievement badges based on career milestones.
 * Earned badges glow, unearned are dimmed.
 */
export const PrestigeBadges: React.FC<PrestigeBadgesProps> = React.memo(({ stats }) => {
    const badges: Badge[] = [
        {
            id: 'centurion',
            icon: '💯',
            label: 'Centurion',
            description: 'Score 100+ runs in an innings',
            earned: stats.hundreds > 0,
            color: 'from-amber-400/20 to-amber-500/10',
        },
        {
            id: 'run_machine',
            icon: '🔥',
            label: 'Run Machine',
            description: 'Score 500+ career runs',
            earned: stats.totalRuns >= 500,
            color: 'from-red-400/20 to-orange-500/10',
        },
        {
            id: 'fifer',
            icon: '🌟',
            label: 'Fifer',
            description: 'Take 5+ wickets in a match',
            earned: stats.fiveWicketHauls > 0,
            color: 'from-purple-400/20 to-purple-500/10',
        },
        {
            id: 'wicket_hunter',
            icon: '💀',
            label: 'Wicket Hunter',
            description: 'Take 50+ career wickets',
            earned: stats.totalWickets >= 50,
            color: 'from-green-400/20 to-green-500/10',
        },
        {
            id: 'half_century',
            icon: '🎖️',
            label: 'Fifty Maker',
            description: 'Score 50+ in an innings',
            earned: stats.fifties > 0 || stats.hundreds > 0,
            color: 'from-sky-400/20 to-blue-500/10',
        },
        {
            id: 'strike_force',
            icon: '⚡',
            label: 'Strike Force',
            description: 'Career strike rate over 150',
            earned: stats.strikeRate > 150,
            color: 'from-yellow-400/20 to-amber-500/10',
        },
        {
            id: 'economy_king',
            icon: '🛡️',
            label: 'Economy King',
            description: 'Career economy under 6.0',
            earned: stats.economy > 0 && stats.economy < 6.0,
            color: 'from-teal-400/20 to-emerald-500/10',
        },
        {
            id: 'all_rounder',
            icon: '🦁',
            label: 'Complete Player',
            description: '200+ runs AND 20+ wickets',
            earned: stats.totalRuns >= 200 && stats.totalWickets >= 20,
            color: 'from-brand/20 to-blue-500/10',
        },
    ];

    const earned = badges.filter(b => b.earned);
    const locked = badges.filter(b => !b.earned);

    return (
        <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🏅</span>
                <h3 className="text-sm font-bold text-foreground">Prestige Badges</h3>
                <span className="text-[10px] text-muted-foreground ml-auto">
                    {earned.length}/{badges.length} earned
                </span>
            </div>

            {/* Earned */}
            {earned.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {earned.map(b => (
                        <div
                            key={b.id}
                            className={`flex flex-col items-center p-2 rounded-xl
                                        bg-gradient-to-br ${b.color} border border-white/50
                                        shadow-sm`}
                            title={b.description}
                        >
                            <span className="text-2xl mb-0.5">{b.icon}</span>
                            <span className="text-[8px] font-bold text-foreground text-center leading-tight">
                                {b.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Locked */}
            {locked.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    {locked.map(b => (
                        <div
                            key={b.id}
                            className="flex flex-col items-center p-2 rounded-xl bg-secondary/50
                                        border border-border/50 opacity-40"
                            title={`${b.label}: ${b.description}`}
                        >
                            <span className="text-2xl mb-0.5 grayscale">{b.icon}</span>
                            <span className="text-[8px] font-medium text-muted-foreground text-center leading-tight">
                                {b.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
});

PrestigeBadges.displayName = 'PrestigeBadges';
