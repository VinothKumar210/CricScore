import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentAdminStore } from '../../features/tournament/tournamentAdminStore';
import { TournamentHeader } from '../../features/tournament/components/TournamentHeader';
import { StandingsTable } from '../../features/tournament/components/StandingsTable';
import { FixtureList } from '../../features/tournament/components/FixtureList';
import { TeamRegistration } from '../../features/tournament/components/TeamRegistration';
import { Container } from '../../components/ui/Container';
import { clsx } from 'clsx';
import { Loader2, ArrowLeft } from 'lucide-react';

type Tab = 'standings' | 'fixtures' | 'teams';

/**
 * TournamentDetailPage — /tournaments/:id route.
 *
 * ARCHITECTURAL RULES:
 * - Fetches detail via tournamentAdminStore (which hydrates engine store)
 * - resetDetail() on unmount (clears both admin + engine store)
 * - Tab navigation: Standings / Fixtures / Teams
 * - Engine computation LAZY — only when standings tab is active
 * - No engine mutation
 * - No scorer imports
 */
export const TournamentDetailPage = () => {
    const { id: tournamentId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const activeTournament = useTournamentAdminStore(s => s.activeTournament);
    const isDetailLoading = useTournamentAdminStore(s => s.isDetailLoading);
    const detailError = useTournamentAdminStore(s => s.detailError);
    const fetchDetail = useTournamentAdminStore(s => s.fetchDetail);
    const resetDetail = useTournamentAdminStore(s => s.resetDetail);
    const registerTeam = useTournamentAdminStore(s => s.registerTeam);
    const generateFixtures = useTournamentAdminStore(s => s.generateFixtures);

    const [activeTab, setActiveTab] = useState<Tab>('standings');

    // Fetch on mount, resetDetail on unmount
    useEffect(() => {
        if (tournamentId) fetchDetail(tournamentId);
        return () => resetDetail();
    }, [tournamentId, fetchDetail, resetDetail]);

    // Build team name map for fixture display
    const teamNameMap = useMemo(() => {
        if (!activeTournament?.teams) return {};
        const map: Record<string, string> = {};
        for (const t of activeTournament.teams) {
            map[t.teamId] = t.team.name;
        }
        return map;
    }, [activeTournament?.teams]);

    // Determine if current user is creator (simplified — backend enforces)
    // In a real app, compare activeTournament.createdById with current user ID
    const isCreator = true; // Backend is authority; UI shows button, backend rejects if not creator

    // Loading
    if (isDetailLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                <p className="text-sm text-textSecondary">Loading tournament...</p>
            </div>
        );
    }

    // Error
    if (detailError) {
        return (
            <Container className="py-8">
                <div className="flex flex-col items-center py-8 gap-3">
                    <p className="text-danger font-semibold">{detailError}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/tournaments')}
                            className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium"
                        >
                            Back to Tournaments
                        </button>
                        <button
                            onClick={() => tournamentId && fetchDetail(tournamentId)}
                            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </Container>
        );
    }

    if (!activeTournament) return null;

    const tabs: { key: Tab; label: string }[] = [
        { key: 'standings', label: 'Standings' },
        { key: 'fixtures', label: 'Fixtures' },
        { key: 'teams', label: 'Teams' },
    ];

    return (
        <Container className="py-4 space-y-6">
            {/* Back Button */}
            <button
                onClick={() => navigate('/tournaments')}
                className="flex items-center gap-1.5 text-textSecondary hover:text-textPrimary
                           transition-colors text-sm"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Tournaments</span>
            </button>

            {/* Header */}
            <TournamentHeader tournament={activeTournament} />

            {/* Tab Navigation */}
            <div className="flex border-b border-border">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={clsx(
                            'px-4 py-2.5 text-sm font-medium transition-colors relative',
                            activeTab === tab.key
                                ? 'text-brand'
                                : 'text-textSecondary hover:text-textPrimary',
                        )}
                    >
                        {tab.label}
                        {activeTab === tab.key && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content — LAZY: only active tab renders */}
            {activeTab === 'standings' && (
                <StandingsTable standings={activeTournament.standings || []} />
            )}

            {activeTab === 'fixtures' && (
                <FixtureList
                    fixtures={activeTournament.fixtures || []}
                    isCreator={isCreator}
                    tournamentId={activeTournament.id}
                    onGenerateFixtures={generateFixtures}
                    teamNameMap={teamNameMap}
                />
            )}

            {activeTab === 'teams' && (
                <TeamRegistration
                    tournament={activeTournament}
                    onRegisterTeam={registerTeam}
                />
            )}
        </Container>
    );
};
