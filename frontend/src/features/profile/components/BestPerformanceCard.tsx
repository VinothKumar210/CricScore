import React from 'react';
import { Card } from '../../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import type { CompetitiveProfile } from '../profileService';

interface BestPerformanceCardProps {
    bestPerformance: CompetitiveProfile['bestPerformance'];
}

/**
 * BestPerformanceCard — Highlights player's best career performance.
 * Links to match replay if matchId available.
 */
export const BestPerformanceCard: React.FC<BestPerformanceCardProps> = React.memo(({ bestPerformance }) => {
    const navigate = useNavigate();

    if (bestPerformance.description === 'N/A') return null;

    const typeIcon = bestPerformance.type === 'batting' ? '🏏'
        : bestPerformance.type === 'bowling' ? '🎳'
            : '⚡';

    const typeLabel = bestPerformance.type === 'batting' ? 'Best Batting'
        : bestPerformance.type === 'bowling' ? 'Best Bowling'
            : 'Best All-Round';

    return (
        <Card padding="md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50
                                    flex items-center justify-center text-xl border border-amber-200/50">
                        {typeIcon}
                    </div>
                    <div>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-medium">
                            {typeLabel}
                        </p>
                        <p className="text-lg font-black text-textPrimary">{bestPerformance.description}</p>
                    </div>
                </div>
                {bestPerformance.matchId && (
                    <button
                        onClick={() => navigate(`/match/${bestPerformance.matchId}`)}
                        className="text-[10px] text-brand font-bold underline"
                    >
                        View Match →
                    </button>
                )}
            </div>
        </Card>
    );
});

BestPerformanceCard.displayName = 'BestPerformanceCard';
