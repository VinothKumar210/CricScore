import React from 'react';
import type { CompetitiveProfile } from '../profileService';

interface ImpactRatingCardProps {
    competitive: CompetitiveProfile;
}

/**
 * ImpactRatingCard — Displays the backend-computed Impact Rating.
 * NO computation in frontend. All values displayed as-is from backend.
 */
export const ImpactRatingCard: React.FC<ImpactRatingCardProps> = React.memo(({ competitive }) => {
    const ratingColor = competitive.impactRating >= 100 ? 'from-amber-400 to-yellow-500'
        : competitive.impactRating >= 50 ? 'from-brand to-blue-500'
            : 'from-gray-400 to-gray-500';

    return (
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5
                        text-white overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-brand/30
                            to-transparent rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-amber-400/20
                            to-transparent rounded-full blur-2xl" />

            <div className="relative flex items-center justify-between">
                {/* Impact Rating */}
                <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">
                        Impact Rating
                    </p>
                    <p className={`text-4xl font-black bg-gradient-to-r ${ratingColor}
                                   bg-clip-text text-transparent`}>
                        {competitive.impactRating}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                        Score: {competitive.impactScore.toLocaleString()}
                    </p>
                </div>

                {/* Global Rank */}
                <div className="text-right">
                    {competitive.globalRank ? (
                        <>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">
                                Global Rank
                            </p>
                            <p className="text-3xl font-black">
                                <span className="text-gray-500">#</span>
                                {competitive.globalRank}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">
                                of {competitive.totalRankedPlayers} players
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">
                                Rank
                            </p>
                            <p className="text-xs text-gray-500">
                                Play 5+ matches<br />to qualify
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Role + PotM */}
            <div className="relative flex items-center gap-3 mt-4 pt-3 border-t border-gray-700/50">
                <span className="px-2 py-0.5 bg-brand/20 text-brand rounded-full text-[10px] font-bold">
                    {competitive.primaryRole}
                </span>
                {competitive.potmCount > 0 && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-[10px] font-bold">
                        🏅 {competitive.potmCount} PotM
                    </span>
                )}
                <span className="text-[10px] text-gray-500 ml-auto">
                    {competitive.matchesPlayed} matches
                </span>
            </div>
        </div>
    );
});

ImpactRatingCard.displayName = 'ImpactRatingCard';
