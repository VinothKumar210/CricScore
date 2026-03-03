import React from 'react';
import type { CompetitiveProfile } from '../profileService';

interface PrestigeProgressProps {
    competitive: CompetitiveProfile;
}

const TIER_CONFIG: Record<string, { color: string; barColor: string }> = {
    Rookie: { color: 'text-muted-foreground', barColor: 'bg-muted-foreground' },
    Rising: { color: 'text-emerald-400', barColor: 'bg-emerald-500' },
    Veteran: { color: 'text-chart-1', barColor: 'bg-chart-1' },
    Elite: { color: 'text-primary', barColor: 'bg-primary' },
    Legend: { color: 'text-amber-400', barColor: 'bg-amber-500' },
};

const TIER_ORDER = ['Rookie', 'Rising', 'Veteran', 'Elite', 'Legend'];

/**
 * PrestigeProgress — Shows tier + progress bar in bordered card style.
 */
export const PrestigeProgress: React.FC<PrestigeProgressProps> = React.memo(({ competitive }) => {
    const config = TIER_CONFIG[competitive.prestigeTier] || TIER_CONFIG.Rookie;
    const tierIdx = TIER_ORDER.indexOf(competitive.prestigeTier);
    const nextTier = tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : null;
    const nextConfig = nextTier ? TIER_CONFIG[nextTier] : null;

    return (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold leading-none tracking-tight">Prestige Tier</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">Your competitive standing</p>
                </div>
                <span className={`text-2xl font-bold ${config.color}`}>
                    {competitive.prestigeTier}
                </span>
            </div>

            {/* Progress bar */}
            {nextTier && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className={`font-semibold ${config.color}`}>{competitive.prestigeTier}</span>
                        <span className="text-muted-foreground tabular-nums">
                            {competitive.prestigeProgressPercent}%
                        </span>
                        <span className={`font-semibold ${nextConfig?.color || 'text-muted-foreground'}`}>
                            {nextTier}
                        </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${config.barColor} transition-all duration-700`}
                            style={{ width: `${competitive.prestigeProgressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Legend — max tier */}
            {!nextTier && (
                <div className="flex items-center justify-center gap-2 bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                    <span className="text-sm font-bold text-amber-400">Maximum tier reached!</span>
                </div>
            )}
        </div>
    );
});

PrestigeProgress.displayName = 'PrestigeProgress';
