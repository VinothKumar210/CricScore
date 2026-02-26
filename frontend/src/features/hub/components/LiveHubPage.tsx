import { useEffect } from 'react';
import { useLiveHubStore } from '../liveHubStore';
import { HubMatchCard } from './HubMatchCard';
import { Container } from '../../../components/ui/Container';
import { typography } from '../../../constants/typography';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

/**
 * LiveHubPage — The main landing page (/).
 *
 * Sections (deterministic order):
 * 1. Your LIVE matches (priority)
 * 2. Public LIVE matches
 * 3. Your recent completed
 * 4. Archive link
 *
 * PERFORMANCE CONTRACT:
 * - No derived bundle creation
 * - No engine calls
 * - All cards render metadata only
 * - 10s polling with visibility pause
 */
export const LiveHubPage = () => {
    const yourMatches = useLiveHubStore(s => s.yourMatches);
    const liveMatches = useLiveHubStore(s => s.liveMatches);
    const recentCompleted = useLiveHubStore(s => s.recentCompleted);
    const liveCount = useLiveHubStore(s => s.liveCount);
    const isLoading = useLiveHubStore(s => s.isLoading);
    const error = useLiveHubStore(s => s.error);
    const fetchFeed = useLiveHubStore(s => s.fetchFeed);
    const startPolling = useLiveHubStore(s => s.startPolling);

    // Initial fetch + start polling
    useEffect(() => {
        fetchFeed();
        const cleanup = startPolling();
        return cleanup;
    }, [fetchFeed, startPolling]);

    // Error state
    if (error && !isLoading && yourMatches.length === 0 && liveMatches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
                <p className="text-destructive mb-2 font-medium">Something went wrong</p>
                <p className="text-muted-foreground text-sm mb-4">{error}</p>
                <button
                    onClick={() => fetchFeed()}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
                               hover:bg-primary/90 transition-colors active:scale-95"
                >
                    Retry
                </button>
            </div>
        );
    }

    const hasAnyLive = yourMatches.some(m => m.status === 'LIVE') || liveMatches.length > 0;

    return (
        <Container className="py-4 space-y-8">
            {/* Live Indicator Banner */}
            {hasAnyLive && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive/100 animate-pulse" />
                    <span className="text-sm font-semibold text-destructive">
                        {liveCount} {liveCount === 1 ? 'match' : 'matches'} live now
                    </span>
                </div>
            )}

            {/* Section 1: Your Matches */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={typography.headingMd}>Your Matches</h2>
                    <Link to="/match/create" className="text-primary text-sm font-medium hover:underline">
                        Create New
                    </Link>
                </div>

                {isLoading && yourMatches.length === 0 ? (
                    <div className="space-y-3">
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                ) : yourMatches.length > 0 ? (
                    <div className="space-y-3">
                        {yourMatches.map(match => (
                            <HubMatchCard key={match.id} match={match} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        message="You haven't joined any matches yet."
                        actionLabel="Find a Match"
                        actionLink="/market"
                    />
                )}
            </section>

            {/* Section 2: Live Now (Public) */}
            {liveMatches.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className={typography.headingMd}>Live Now</h2>
                        <span className="px-2 py-0.5 bg-destructive/15 text-destructive rounded-full text-xs font-bold">
                            {liveMatches.length}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {liveMatches.map(match => (
                            <HubMatchCard key={match.id} match={match} />
                        ))}
                    </div>
                </section>
            )}

            {/* Section 3: Recent Completed */}
            {recentCompleted.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={typography.headingMd}>Recently Completed</h2>
                    </div>
                    <div className="space-y-3">
                        {recentCompleted.map(match => (
                            <HubMatchCard key={match.id} match={match} />
                        ))}
                    </div>
                </section>
            )}

            {/* Section 4: Archive Link */}
            <section>
                <Link
                    to="/archive"
                    className={clsx(
                        'flex items-center justify-between',
                        'bg-card border border-border rounded-xl p-4',
                        'hover:shadow-sm transition-shadow group'
                    )}
                >
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Match Archive</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Browse your completed matches with full replay
                        </p>
                    </div>
                    <span className="text-muted-foreground group-hover:text-primary transition-colors text-lg">
                        →
                    </span>
                </Link>
            </section>
        </Container>
    );
};

// ─── Helper Components ───

const SkeletonCard = () => (
    <div className="h-36 bg-card rounded-xl animate-pulse" />
);

const EmptyState = ({ message, actionLabel, actionLink }: {
    message: string;
    actionLabel?: string;
    actionLink?: string;
}) => (
    <div className="bg-card rounded-xl p-8 text-center border border-dashed border-border">
        <p className="text-muted-foreground text-sm mb-3">{message}</p>
        {actionLabel && actionLink && (
            <Link to={actionLink} className="text-primary font-medium text-sm hover:underline">
                {actionLabel}
            </Link>
        )}
    </div>
);
