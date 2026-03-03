import React from 'react';
import type { CompetitiveProfile } from '../profileService';

interface ImpactRatingCardProps {
    competitive: CompetitiveProfile;
}

/**
 * ImpactRatingCard — Displays Impact Rating with SVG sparkline.
 * Matches shadcn card style: bordered card, large number, trend indicator, sparkline.
 */
export const ImpactRatingCard: React.FC<ImpactRatingCardProps> = React.memo(({ competitive }) => {
    const trendPositive = competitive.impactRating >= 50;

    return (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
                <div className="flex items-center justify-between pb-2">
                    <h3 className="font-semibold leading-none tracking-tight text-sm">Impact Rating</h3>
                    <span className="text-xs text-muted-foreground">
                        {competitive.matchesPlayed} matches
                    </span>
                </div>

                <div className="flex items-baseline space-x-2 mt-2">
                    <div className="text-4xl font-bold tabular-nums">{competitive.impactRating}</div>
                    {competitive.consistencyScore > 0 && (
                        <span className={`text-sm font-medium flex items-center ${trendPositive ? 'text-emerald-500' : 'text-destructive'}`}>
                            <svg className="w-4 h-4 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {trendPositive ? (
                                    <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
                                ) : (
                                    <path d="M23 18l-9.5-9.5-5 5L1 6" strokeLinecap="round" strokeLinejoin="round" />
                                )}
                            </svg>
                            {competitive.consistencyScore}%
                        </span>
                    )}
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                    {competitive.globalRank
                        ? `Rank #${competitive.globalRank} of ${competitive.totalRankedPlayers} players`
                        : 'Play 5+ matches to qualify for ranking'}
                </p>

                {/* SVG Sparkline */}
                <div className="mt-6 h-16 w-full">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 60">
                        <defs>
                            <linearGradient id="impactGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0,50 C20,45 40,48 60,35 C80,22 100,40 120,30 C140,20 160,25 180,15 C200,5 220,10 240,15 C260,20 280,5 300,10"
                            fill="none" stroke="var(--color-primary)" strokeLinecap="round" strokeWidth="2"
                        />
                        <path
                            d="M0,50 C20,45 40,48 60,35 C80,22 100,40 120,30 C140,20 160,25 180,15 C200,5 220,10 240,15 C260,20 280,5 300,10 V60 H0 Z"
                            fill="url(#impactGradient)" stroke="none"
                        />
                    </svg>
                </div>

                {/* Role + PotM badges */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                        {competitive.primaryRole}
                    </span>
                    {competitive.potmCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-bold border border-amber-500/20">
                            🏅 {competitive.potmCount} PotM
                        </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                        Score: {competitive.impactScore.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
});

ImpactRatingCard.displayName = 'ImpactRatingCard';
