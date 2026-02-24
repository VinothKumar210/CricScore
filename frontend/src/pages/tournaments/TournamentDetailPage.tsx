import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentAdminStore } from '../../features/tournament/tournamentAdminStore';
import { useTournamentStore, getBracket, getResolvedBracket } from '../../features/tournament/tournamentStore';
import { TournamentHeader } from '../../features/tournament/components/TournamentHeader';
import { StandingsTable } from '../../features/tournament/components/StandingsTable';
import { FixtureList } from '../../features/tournament/components/FixtureList';
import { TeamRegistration } from '../../features/tournament/components/TeamRegistration';
import { BracketView } from '../../features/tournament/bracket/BracketView';
import { Container } from '../../components/ui/Container';
import { clsx } from 'clsx';
import { Loader2, ArrowLeft } from 'lucide-react';
import { shallow } from 'zustand/shallow';
import type { BracketFormat } from '../../features/tournament/bracket/types';
import type { PlayoffMatchResult } from '../../features/tournament/progression/types';

type Tab = 'standings' | 'fixtures' | 'teams' | 'bracket';

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
        { key: 'bracket', label: 'Bracket' },
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

            {/* BRACKET TAB — LAZY: only computes when active */}
            {activeTab === 'bracket' && (
                <BracketTabContent
                    teamNameMap={teamNameMap}
                    tournamentStatus={activeTournament.status}
                    format={(activeTournament as any).bracketFormat || 'STANDARD_TOP4'}
                    playoffResults={(activeTournament as any).playoffResults || []}
                    isCreator={isCreator}
                />
            )}
        </Container>
    );
};

/**
 * BracketTabContent — Isolated component to enforce LAZY bracket computation.
 * Engine selectors only fire when this component mounts (bracket tab active).
 * Uses shallow equality to prevent unnecessary re-renders.
 */
const BracketTabContent: React.FC<{
    teamNameMap: Record<string, string>;
    tournamentStatus: string;
    format: BracketFormat;
    playoffResults: PlayoffMatchResult[];
    isCreator: boolean;
}> = ({ teamNameMap, tournamentStatus, format, playoffResults, isCreator }) => {
    // Select ONLY raw dependency, avoid re-running engine on unconnected store changes
    const completedMatches = useTournamentStore(s => s.completedMatches);

    // Compute bracket natively with stable dependencies
    const bracket = useMemo(() => {
        try {
            return getBracket({ completedMatches } as any, format);
        } catch {
            return { matches: [] };
        }
    }, [completedMatches, format]);

    const resolvedBracket = useMemo(() => {
        try {
            return getResolvedBracket({ completedMatches } as any, format, playoffResults);
        } catch {
            return bracket;
        }
    }, [completedMatches, format, playoffResults, bracket]);

    return (
        <BracketView
            bracket={resolvedBracket}
            results={playoffResults}
            teamNames={teamNameMap}
            tournamentStatus={tournamentStatus}
            isCreator={isCreator}
        />
    );
};
