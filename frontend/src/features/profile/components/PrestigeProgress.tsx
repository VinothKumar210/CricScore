import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { CompetitiveProfile } from '../profileService';

interface PrestigeProgressProps {
    competitive: CompetitiveProfile;
}

const TIER_CONFIG: Record<string, { icon: string; color: string; gradient: string }> = {
    Rookie: { icon: '🏷️', color: 'text-gray-400', gradient: 'from-gray-300 to-gray-400' },
    Rising: { icon: '🌱', color: 'text-green-500', gradient: 'from-green-400 to-emerald-500' },
    Veteran: { icon: '⭐', color: 'text-blue-500', gradient: 'from-blue-400 to-blue-600' },
    Elite: { icon: '💎', color: 'text-purple-500', gradient: 'from-purple-400 to-purple-600' },
    Legend: { icon: '👑', color: 'text-amber-500', gradient: 'from-amber-400 to-yellow-500' },
};

const TIER_ORDER = ['Rookie', 'Rising', 'Veteran', 'Elite', 'Legend'];

/**
 * PrestigeProgress — Shows tier badge + next-tier progress bar.
 * ALL values from backend. Zero frontend computation.
 */
export const PrestigeProgress: React.FC<PrestigeProgressProps> = React.memo(({ competitive }) => {
    const config = TIER_CONFIG[competitive.prestigeTier] || TIER_CONFIG.Rookie;
    const tierIdx = TIER_ORDER.indexOf(competitive.prestigeTier);
    const nextTier = tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : null;
    const nextConfig = nextTier ? TIER_CONFIG[nextTier] : null;

    return (
        <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{config.icon}</span>
                <div>
                    <h3 className={`text-sm font-black ${config.color}`}>{competitive.prestigeTier}</h3>
                    <p className="text-[10px] text-textSecondary">Prestige Tier</p>
                </div>
            </div>

            {/* Progress bar */}
            {nextTier && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px]">
                        <span className={config.color}>{competitive.prestigeTier}</span>
                        <span className="text-textSecondary">{competitive.prestigeProgressPercent}%</span>
                        <span className={nextConfig?.color || 'text-gray-400'}>
                            {nextConfig?.icon} {nextTier}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${config.gradient}
                                        transition-all duration-500`}
                            style={{ width: `${competitive.prestigeProgressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Legend — max tier */}
            {!nextTier && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50
                                rounded-lg p-2 border border-amber-200/50">
                    <span className="text-lg">👑</span>
                    <span className="text-xs font-bold text-amber-700">Maximum tier reached!</span>
                </div>
            )}
        </Card>
    );
});

PrestigeProgress.displayName = 'PrestigeProgress';
