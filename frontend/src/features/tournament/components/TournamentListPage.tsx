import { useEffect, useState } from 'react';
import { useTournamentAdminStore } from '../tournamentAdminStore';
import { TournamentCard } from './TournamentCard';
import { TournamentCreateModal } from './TournamentCreateModal';
import { Container } from '../../../components/ui/Container';
import { typography } from '../../../constants/typography';
import { Plus } from 'lucide-react';

/**
 * TournamentListPage — /tournaments route.
 *
 * PERFORMANCE CONTRACT:
 * - Zero engine selectors
 * - Zero standings computation
 * - All cards render metadata only
 * - resetList() on unmount
 */
export const TournamentListPage = () => {
    const tournaments = useTournamentAdminStore(s => s.tournaments);
    const isListLoading = useTournamentAdminStore(s => s.isListLoading);
    const listError = useTournamentAdminStore(s => s.listError);
    const fetchList = useTournamentAdminStore(s => s.fetchList);
    const resetList = useTournamentAdminStore(s => s.resetList);
    const createTournament = useTournamentAdminStore(s => s.createTournament);

    const [isCreateOpen, setIsCreateOpen] = useState(false);

    useEffect(() => {
        fetchList();
        return () => resetList();
    }, [fetchList, resetList]);

    return (
        <Container className="py-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className={typography.headingLg}>🏆 Tournaments</h1>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg
                               text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create
                </button>
            </div>

            {/* Error */}
            {listError && (
                <div className="flex flex-col items-center py-8 gap-3">
                    <p className="text-destructive font-medium">{listError}</p>
                    <button
                        onClick={fetchList}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Loading */}
            {isListLoading && tournaments.length === 0 && !listError && (
                <div className="space-y-3">
                    <div className="h-24 bg-card rounded-xl animate-pulse" />
                    <div className="h-24 bg-card rounded-xl animate-pulse" />
                    <div className="h-24 bg-card rounded-xl animate-pulse" />
                </div>
            )}

            {/* Cards */}
            {tournaments.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                    {tournaments.map(t => (
                        <TournamentCard key={t.id} tournament={t} />
                    ))}
                </div>
            )}

            {/* Empty */}
            {!isListLoading && !listError && tournaments.length === 0 && (
                <div className="bg-card rounded-xl p-8 text-center border border-dashed border-border">
                    <p className="text-muted-foreground text-sm">No tournaments yet. Create one to get started.</p>
                </div>
            )}

            {/* Create Modal */}
            <TournamentCreateModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreate={createTournament}
            />
        </Container>
    );
};
