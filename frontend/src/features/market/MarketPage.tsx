import React, { useEffect } from 'react';
import { useMarketStore } from './marketStore';
import { MarketFilters } from './components/MarketFilters';
import { MarketMatchCard } from './components/MarketMatchCard';
import { MarketSkeleton } from './components/MarketSkeleton';
import { MarketEmptyState } from './components/MarketEmptyState';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export const MarketPage: React.FC = () => {
    const { matches, isLoading, error, fetchFeed } = useMarketStore();

    useEffect(() => {
        // Initial fetch on mount
        fetchFeed();
    }, [fetchFeed]);

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Marketplace</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Discover nearby teams looking exactly for your kind of challenge.
                    </p>
                </div>
                {/* We can add a "Create Challenge" CTA here if needed later */}
            </div>

            {/* Debounced Filter Inputs */}
            <MarketFilters />

            {/* Error Fallback */}
            {error && (
                <div className="p-4 mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm">
                    {error}
                </div>
            )}

            {/* Main Content Grid */}
            <div className="relative">
                {/* Re-fetching overlay block. Doesn't destroy layout, just fades lightly. */}
                {isLoading && matches.length > 0 && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-card-950/50 backdrop-blur-[2px] z-10 rounded-xl flex items-center justify-center touch-none">
                        <ArrowPathIcon className="h-8 w-8 text-brand-500 animate-spin absolute top-20" />
                    </div>
                )}

                {isLoading && matches.length === 0 ? (
                    <MarketSkeleton />
                ) : matches.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {matches.map(match => (
                            <MarketMatchCard key={match.id} match={match} />
                        ))}
                    </div>
                ) : (
                    <MarketEmptyState />
                )}
            </div>
        </div>
    );
};
