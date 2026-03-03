import { useEffect } from 'react';
import { useMarketStore } from './marketStore';
import { MarketFilters } from './components/MarketFilters';
import { MarketMatchCard } from './components/MarketMatchCard';
import { MarketSkeleton } from './components/MarketSkeleton';
import { MarketEmptyState } from './components/MarketEmptyState';
import { Loader2, Store } from 'lucide-react';

export const MarketPage = () => {
    const { matches, isLoading, error, fetchFeed } = useMarketStore();

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    return (
        <div className="max-w-2xl mx-auto py-6 px-4">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <Store className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Marketplace</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                    Discover nearby teams looking for your kind of challenge.
                </p>
            </div>

            {/* Filters */}
            <MarketFilters />

            {/* Error */}
            {error && (
                <div className="p-4 mb-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="relative">
                {/* Refetching overlay */}
                {isLoading && matches.length > 0 && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                )}

                {isLoading && matches.length === 0 ? (
                    <MarketSkeleton />
                ) : matches.length > 0 ? (
                    <div className="space-y-3">
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
