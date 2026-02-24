import React from 'react';

interface ChampionBannerProps {
    teamName: string;
}

/**
 * ChampionBanner — Shows tournament champion.
 * Only rendered when tournament status === COMPLETED.
 * Team name comes from resolved bracket (engine selector output).
 */
export const ChampionBanner: React.FC<ChampionBannerProps> = React.memo(({ teamName }) => (
    <div className="relative bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500
                    rounded-2xl p-5 text-center overflow-hidden shadow-lg shadow-amber-200/30">
        {/* Decorative shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                        animate-pulse" />

        <div className="relative">
            <p className="text-amber-900/70 text-[10px] uppercase tracking-[0.3em] font-bold mb-1">
                Tournament Champion
            </p>
            <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🏆</span>
                <h2 className="text-xl font-black text-amber-900">{teamName}</h2>
                <span className="text-2xl">🏆</span>
            </div>
        </div>
    </div>
));

ChampionBanner.displayName = 'ChampionBanner';
