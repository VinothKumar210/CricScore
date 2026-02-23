import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useArchiveStore } from '../archiveStore';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import { Loader2, ArrowLeft } from 'lucide-react';
import { createDerivedBundle } from '../../scoring/derived/derivedBundle';
import type { MatchConfig } from '../../scoring/engine/initialState';
import type { MatchDetail } from '../../matches/types/domainTypes';
import type { BallEvent } from '../../scoring/types/ballEventTypes';
import { ExportButton } from '../../export/components/ExportButton';

/**
 * ArchiveDetailPage — /archive/:id route.
 *
 * Fetches full archive (from IndexedDB cache or API).
 * Creates DerivedBundle for replay: Core + Phase layers.
 * resetDetail() on unmount.
 *
 * IMPORT AUDIT:
 * ✅ createDerivedBundle (read-only factory)
 * ✅ MatchConfig, MatchDetail, BallEvent (types only)
 * ❌ NO ControlPad
 * ❌ NO scoringStore
 * ❌ NO useScoringSocket
 */
export const ArchiveDetailPage = () => {
    const { id: archiveId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const activeArchive = useArchiveStore(s => s.activeArchive);
    const isDetailLoading = useArchiveStore(s => s.isDetailLoading);
    const detailError = useArchiveStore(s => s.detailError);
    const fetchDetail = useArchiveStore(s => s.fetchDetail);
    const resetDetail = useArchiveStore(s => s.resetDetail);

    // Fetch on mount, resetDetail on unmount
    useEffect(() => {
        if (archiveId) fetchDetail(archiveId);
        return () => resetDetail();
    }, [archiveId, fetchDetail, resetDetail]);

    // Build derived bundle from archive data
    const bundle = useMemo(() => {
        if (!activeArchive || !activeArchive.events.length) return null;

        const ballEvents: BallEvent[] = activeArchive.events.map(e => e.payload as BallEvent);
        const config = activeArchive.matchConfig;

        const engineConfig: MatchConfig = {
            matchId: activeArchive.matchId,
            teamA: { id: 'archive-a', name: config.homeTeamName, players: [] },
            teamB: { id: 'archive-b', name: config.awayTeamName, players: [] },
            oversPerInnings: config.overs,
        };

        const matchTemplate: MatchDetail = {
            id: activeArchive.matchId,
            status: 'COMPLETED',
            teamA: { id: 'archive-a', name: config.homeTeamName },
            teamB: { id: 'archive-b', name: config.awayTeamName },
            innings: [],
            startTime: activeArchive.matchDate,
            isUserInvolved: true,
            recentOvers: [],
        };

        return createDerivedBundle(ballEvents, engineConfig, matchTemplate, null);
    }, [activeArchive]);

    // Loading
    if (isDetailLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                <p className="text-sm text-textSecondary">Loading archive...</p>
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
                            onClick={() => navigate('/archive')}
                            className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium"
                        >
                            Back to Archive
                        </button>
                        <button
                            onClick={() => archiveId && fetchDetail(archiveId)}
                            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </Container>
        );
    }

    if (!activeArchive) return null;

    const phase = bundle?.getPhase();

    return (
        <Container className="py-4 space-y-6">
            {/* Back Button */}
            <button
                onClick={() => navigate('/archive')}
                className="flex items-center gap-1.5 text-textSecondary hover:text-textPrimary
                           transition-colors text-sm"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Archive</span>
            </button>

            {/* Match Header */}
            <Card padding="lg">
                <div className="flex items-center justify-between mb-3">
                    <h1 className={typography.headingLg}>
                        {activeArchive.homeTeamName} vs {activeArchive.awayTeamName}
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                            Archived
                        </span>
                        <ExportButton archiveId={archiveId || ''} archive={activeArchive} />
                    </div>
                </div>

                {activeArchive.result && (
                    <p className="text-sm font-semibold text-brand mb-3">
                        {activeArchive.result}
                    </p>
                )}

                <div className="flex items-center gap-3 text-xs text-textSecondary">
                    <span>
                        {new Date(activeArchive.matchDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </span>
                    <span>·</span>
                    <span>{activeArchive.overs} overs</span>
                    <span>·</span>
                    <span>{activeArchive.eventCount} events</span>
                    <span>·</span>
                    <span>Engine v{activeArchive.engineVersion}</span>
                </div>
            </Card>

            {/* Battery Summary */}
            {bundle && (
                <Card padding="md">
                    <h3 className={clsx(typography.headingMd, 'mb-3')}>Match Summary</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <StatBox label="Total Events" value={String(activeArchive.eventCount)} />
                        <StatBox label="Overs" value={`${activeArchive.overs}`} />
                    </div>
                </Card>
            )}

            {/* Batting */}
            {phase && phase.batsmanStats.length > 0 && (
                <Card padding="md">
                    <h3 className={clsx(typography.headingMd, 'mb-3')}>🏏 Batting</h3>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-textSecondary border-b border-border">
                                <th className="text-left py-1 font-medium">Batter</th>
                                <th className="text-right py-1 font-medium">R</th>
                                <th className="text-right py-1 font-medium">B</th>
                                <th className="text-right py-1 font-medium">4s</th>
                                <th className="text-right py-1 font-medium">6s</th>
                                <th className="text-right py-1 font-medium">SR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {phase.batsmanStats.map((b) => (
                                <tr key={b.playerId} className="border-b border-border/30">
                                    <td className="py-1.5 font-medium text-textPrimary">{b.playerId}</td>
                                    <td className="text-right py-1.5 tabular-nums font-semibold">{b.runs}</td>
                                    <td className="text-right py-1.5 tabular-nums">{b.balls}</td>
                                    <td className="text-right py-1.5 tabular-nums">{b.fours}</td>
                                    <td className="text-right py-1.5 tabular-nums">{b.sixes}</td>
                                    <td className="text-right py-1.5 tabular-nums">{b.strikeRate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Bowling */}
            {phase && phase.bowlingStats.length > 0 && (
                <Card padding="md">
                    <h3 className={clsx(typography.headingMd, 'mb-3')}>🎳 Bowling</h3>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-textSecondary border-b border-border">
                                <th className="text-left py-1 font-medium">Bowler</th>
                                <th className="text-right py-1 font-medium">O</th>
                                <th className="text-right py-1 font-medium">R</th>
                                <th className="text-right py-1 font-medium">W</th>
                                <th className="text-right py-1 font-medium">Eco</th>
                            </tr>
                        </thead>
                        <tbody>
                            {phase.bowlingStats.map((b) => (
                                <tr key={b.bowlerId} className="border-b border-border/30">
                                    <td className="py-1.5 font-medium text-textPrimary">{b.bowlerId}</td>
                                    <td className="text-right py-1.5 tabular-nums">{b.overs}</td>
                                    <td className="text-right py-1.5 tabular-nums">{b.runsConceded}</td>
                                    <td className="text-right py-1.5 tabular-nums font-semibold">{b.wickets}</td>
                                    <td className="text-right py-1.5 tabular-nums">{b.economy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Fall of Wickets */}
            {phase && phase.fallOfWickets.length > 0 && (
                <Card padding="md">
                    <h3 className={clsx(typography.headingMd, 'mb-3')}>Fall of Wickets</h3>
                    <div className="flex flex-wrap gap-2">
                        {phase.fallOfWickets.map((fow, i) => (
                            <span
                                key={i}
                                className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium"
                            >
                                {fow.score} ({fow.over})
                            </span>
                        ))}
                    </div>
                </Card>
            )}
        </Container>
    );
};

// ─── Helper ───

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-surface rounded-lg p-3 text-center">
        <p className="text-lg font-bold text-textPrimary tabular-nums">{value}</p>
        <p className="text-xs text-textSecondary mt-0.5">{label}</p>
    </div>
);
