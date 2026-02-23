import React from 'react';
import { Card } from '../../../components/ui/Card';
import { StatCard } from './StatCard';
import type { CareerStats } from '../profileService';

interface CareerStatsGridProps {
    stats: CareerStats;
}

/**
 * CareerStatsGrid — Batting + bowling career aggregates.
 * Premium two-section layout with highlighted key stats.
 */
export const CareerStatsGrid: React.FC<CareerStatsGridProps> = React.memo(({ stats }) => {
    return (
        <div className="space-y-4">
            {/* Batting */}
            <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🏏</span>
                    <h3 className="text-sm font-bold text-textPrimary">Batting</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-brand/20 to-transparent ml-2" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Runs" value={stats.totalRuns} highlight icon="🔥" />
                    <StatCard label="Average" value={stats.battingAverage} highlight />
                    <StatCard label="Strike Rate" value={stats.strikeRate} />
                    <StatCard label="Innings" value={stats.innings} />
                    <StatCard label="Highest" value={stats.highestScore} icon="🏆" />
                    <StatCard label="50s / 100s" value={`${stats.fifties} / ${stats.hundreds}`} icon="⭐" />
                </div>
            </Card>

            {/* Bowling */}
            <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🎳</span>
                    <h3 className="text-sm font-bold text-textPrimary">Bowling</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-400/20 to-transparent ml-2" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Wickets" value={stats.totalWickets} highlight icon="💥" />
                    <StatCard label="Average" value={stats.bowlingAverage} highlight />
                    <StatCard label="Economy" value={stats.economy} />
                    <StatCard label="Best" value={stats.bestBowling} icon="🎯" />
                    <StatCard label="5-Wicket" value={stats.fiveWicketHauls} icon="🌟" />
                    <StatCard label="" value="" />
                </div>
            </Card>
        </div>
    );
});

CareerStatsGrid.displayName = 'CareerStatsGrid';
