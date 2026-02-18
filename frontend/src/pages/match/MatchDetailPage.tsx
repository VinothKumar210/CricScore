import { useEffect } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useMatchDetailStore } from '../../features/matches/matchDetailStore';
import { MatchHeader } from '../../features/matches/components/MatchHeader';
import { MatchTabs } from '../../features/matches/components/MatchTabs';
import { Container } from '../../components/ui/Container';

export const MatchDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    // fetch logic remains same
    const { match, isLoading, error, fetchMatchDetail } = useMatchDetailStore();

    useEffect(() => {
        if (id) {
            // Logic to prevent re-fetching if already loaded can be added here
            // but strictly following instruction: "MatchDetailPage does NOT re-fetch match on tab change."
            // Since component unmounts/remounts on route change only if parent changes? 
            // Actually with nested routes, the parent component (MatchDetailPage) stays mounted!
            // So fetch is only called when `id` changes. This is efficient.
            fetchMatchDetail(id);
        }
    }, [id, fetchMatchDetail]);

    if (isLoading) {
        return (
            <Container className="py-4">
                <div className="h-48 bg-surface rounded-xl animate-pulse" />
            </Container>
        );
    }

    if (error || !match) {
        return (
            <Container className="py-4 text-center">
                <div className="bg-surface rounded-xl p-8 border border-dashed border-border">
                    <p className="text-danger mb-2 font-medium">Error loading match</p>
                    <p className="text-textSecondary text-sm mb-4">{error || "Match not found"}</p>
                </div>
            </Container>
        );
    }

    return (
        <Container className="py-4 space-y-4">
            <MatchHeader match={match} />
            <MatchTabs />
            <Outlet />
        </Container>
    );
};
