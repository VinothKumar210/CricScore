import { useEffect } from 'react';
import { useHomeFeedStore } from '../../features/matches/homeFeedStore';
import { MatchCard } from '../../features/matches/components/MatchCard';
import { Container } from '../../components/ui/Container';
import { typography } from '../../constants/typography';
import { Link } from 'react-router-dom';

export const HomePage = () => {
    const { yourMatches, liveMatches, isLoading, error, fetchHomeFeed } = useHomeFeedStore();

    useEffect(() => {
        fetchHomeFeed();
    }, [fetchHomeFeed]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
                <p className="text-danger mb-2 font-medium">Something went wrong</p>
                <p className="text-textSecondary text-sm mb-4">{error}</p>
                <button
                    onClick={() => fetchHomeFeed()}
                    className="px-4 py-2 bg-textPrimary text-white rounded-lg text-sm"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <Container className="py-4 space-y-8">
            {/* Your Matches Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={typography.headingMd}>Your Matches</h2>
                    <Link to="/match/create" className="text-brand text-sm font-medium">
                        Create New
                    </Link>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                ) : yourMatches.length > 0 ? (
                    <div className="space-y-3">
                        {yourMatches.map(match => (
                            <MatchCard key={match.id} match={match} />
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

            {/* Live Matches Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={typography.headingMd}>Live Now</h2>
                    <Link to="/market" className="text-brand text-sm font-medium">
                        View All
                    </Link>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                ) : liveMatches.length > 0 ? (
                    <div className="space-y-3">
                        {liveMatches.map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        message="No live matches right now."
                    />
                )}
            </section>
        </Container>
    );
};

// Helper Components
const SkeletonCard = () => (
    <div className="h-40 bg-surface rounded-xl animate-pulse" />
);

const EmptyState = ({ message, actionLabel, actionLink }: { message: string, actionLabel?: string, actionLink?: string }) => (
    <div className="bg-surface rounded-xl p-8 text-center border border-dashed border-border">
        <p className="text-textSecondary text-sm mb-3">{message}</p>
        {actionLabel && actionLink && (
            <Link to={actionLink} className="text-brand font-medium text-sm hover:underline">
                {actionLabel}
            </Link>
        )}
    </div>
);
