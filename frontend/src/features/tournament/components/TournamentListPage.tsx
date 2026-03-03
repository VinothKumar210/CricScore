import { useEffect, useState } from 'react';
import { useTournamentAdminStore } from '../tournamentAdminStore';
import { TournamentCard } from './TournamentCard';
import { TournamentCreateModal } from './TournamentCreateModal';
import { Container } from '../../../components/ui/Container';
import { Plus, Trophy } from 'lucide-react';

/**
 * TournamentListPage — /tournaments route.
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
        <Container className="py-6 pb-24 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl
                               text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    Create
                </button>
            </div>

            {/* Error */}
            {listError && (
                <div className="flex flex-col items-center py-12 gap-4">
                    <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-destructive" />
                    </div>
                    <p className="text-destructive font-medium text-sm">{listError}</p>
                    <button
                        onClick={fetchList}
                        className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Loading */}
            {isListLoading && tournaments.length === 0 && !listError && (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-card rounded-xl border border-border p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="h-5 w-36 bg-secondary rounded-lg animate-pulse" />
                                <div className="h-5 w-20 bg-secondary rounded-full animate-pulse" />
                            </div>
                            <div className="flex gap-3">
                                <div className="h-4 w-16 bg-secondary rounded-lg animate-pulse" />
                                <div className="h-4 w-20 bg-secondary rounded-lg animate-pulse" />
                                <div className="h-4 w-24 bg-secondary rounded-lg animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Cards */}
            {tournaments.length > 0 && (
                <div className="space-y-3">
                    {tournaments.map(t => (
                        <TournamentCard key={t.id} tournament={t} />
                    ))}
                </div>
            )}

            {/* Empty */}
            {!isListLoading && !listError && tournaments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Trophy className="w-9 h-9 text-primary" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-foreground">No Tournaments Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                            Create your first tournament to organize competitive matches
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Tournament
                    </button>
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
