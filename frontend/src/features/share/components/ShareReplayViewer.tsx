import React, { useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import type { ShareEvent, ShareMatchConfig, ScrubbedMatch } from '../types';
import { createDerivedBundle } from '../../scoring/derived/derivedBundle';
import type { MatchConfig } from '../../scoring/engine/initialState';
import type { MatchDetail } from '../../matches/types/domainTypes';
import type { BallEvent } from '../../scoring/types/ballEventTypes';

/**
 * ShareReplayViewer — Bundle-backed replay for COMPLETED matches.
 *
 * IMPORT AUDIT:
 * ✅ createDerivedBundle (read-only factory)
 * ✅ MatchConfig, MatchDetail, BallEvent (types only)
 * ❌ NO ControlPad — never imported
 * ❌ NO ScoringPage — never imported
 * ❌ NO scoringStore — never imported
 * ❌ NO useScoringSocket — never imported
 */

interface ShareReplayViewerProps {
    match: ScrubbedMatch;
    events: ShareEvent[];
    matchConfig: ShareMatchConfig;
}

export const ShareReplayViewer: React.FC<ShareReplayViewerProps> = React.memo(({
    match,
    events,
    matchConfig,
}) => {
    // Convert API events to engine BallEvents
    const ballEvents: BallEvent[] = useMemo(() => {
        return events.map(e => e.payload as BallEvent);
    }, [events]);

    // Build engine MatchConfig from API data
    const engineConfig: MatchConfig = useMemo(() => ({
        matchId: match.id,
        teamA: { id: 'share-a', name: match.homeTeamName, players: [] },
        teamB: { id: 'share-b', name: match.awayTeamName, players: [] },
        oversPerInnings: matchConfig.overs,
    }), [match, matchConfig]);

    // Build minimal MatchDetail template for domain mapping
    const matchTemplate: MatchDetail = useMemo(() => ({
        id: match.id,
        status: match.status,
        teamA: { id: 'share-a', name: match.homeTeamName },
        teamB: { id: 'share-b', name: match.awayTeamName },
        innings: [],
        startTime: match.matchDate,
        isUserInvolved: false,
        recentOvers: [],
    }), [match]);

    // Create derived bundle (Core + Phase layers only)
    const bundle = useMemo(() => {
        if (ballEvents.length === 0) return null;
        return createDerivedBundle(ballEvents, engineConfig, matchTemplate, null);
    }, [ballEvents, engineConfig, matchTemplate]);

    if (!bundle) {
        return (
            <Card padding="md" className="text-center">
                <p className="text-textSecondary text-sm">No replay data available</p>
            </Card>
        );
    }

    const phase = bundle.getPhase();

    return (
        <div className="space-y-4">
            {/* Replay Summary */}
            <Card padding="md">
                <h3 className={clsx(typography.headingMd, 'mb-3')}>Match Replay</h3>
                <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Total Events" value={String(events.length)} />
                    <StatBox label="Overs" value={matchConfig.overs ? `${matchConfig.overs}` : '—'} />
                </div>
            </Card>

            {/* Batting Summary */}
            {phase.batsmanStats.length > 0 && (
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

            {/* Bowling Summary */}
            {phase.bowlingStats.length > 0 && (
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
            {phase.fallOfWickets.length > 0 && (
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
        </div>
    );
});

ShareReplayViewer.displayName = 'ShareReplayViewer';

// ─── Helper ───

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-surface rounded-lg p-3 text-center">
        <p className="text-lg font-bold text-textPrimary tabular-nums">{value}</p>
        <p className="text-xs text-textSecondary mt-0.5">{label}</p>
    </div>
);
