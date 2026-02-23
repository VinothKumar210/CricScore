import React from 'react';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import type { TournamentStanding } from '../tournamentAdminService';

interface StandingsTableProps {
    standings: TournamentStanding[];
}

/**
 * StandingsTable — Renders league standings.
 *
 * ARCHITECTURAL RULE:
 * This component renders backend-provided standings directly.
 * When the backend provides full CompletedMatch[] data, the engine
 * selector (getLeagueTable) can be used via useTournamentStore.
 *
 * For now, standings come pre-computed from the backend's
 * tournament.standings relation, which is the authoritative source.
 *
 * NO manual NRR computation.
 * NO deriveLeagueTable call.
 * NO engine mutation.
 */
export const StandingsTable: React.FC<StandingsTableProps> = React.memo(({ standings }) => {
    if (standings.length === 0) {
        return (
            <Card padding="md">
                <div className="text-center py-6">
                    <p className="text-sm text-textSecondary">
                        No standings data yet. Complete some matches first.
                    </p>
                </div>
            </Card>
        );
    }

    // Sort by points desc, then NRR desc
    const sorted = [...standings].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.netRunRate - a.netRunRate;
    });

    return (
        <Card padding="md">
            <h3 className={clsx(typography.headingMd, 'mb-3')}>Standings</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-textSecondary border-b border-border">
                            <th className="text-left py-2 font-medium w-8">#</th>
                            <th className="text-left py-2 font-medium">Team</th>
                            <th className="text-center py-2 font-medium">P</th>
                            <th className="text-center py-2 font-medium">W</th>
                            <th className="text-center py-2 font-medium">L</th>
                            <th className="text-center py-2 font-medium">T</th>
                            <th className="text-center py-2 font-medium">NR</th>
                            <th className="text-right py-2 font-medium">Pts</th>
                            <th className="text-right py-2 font-medium">NRR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((s, i) => (
                            <tr
                                key={s.id}
                                className={clsx(
                                    'border-b border-border/30',
                                    i < 2 && 'bg-green-50/50', // Qualification zone
                                )}
                            >
                                <td className="py-2 text-textSecondary">{i + 1}</td>
                                <td className="py-2 font-medium text-textPrimary">{s.team.name}</td>
                                <td className="py-2 text-center tabular-nums">{s.played}</td>
                                <td className="py-2 text-center tabular-nums font-semibold">{s.won}</td>
                                <td className="py-2 text-center tabular-nums">{s.lost}</td>
                                <td className="py-2 text-center tabular-nums">{s.tied}</td>
                                <td className="py-2 text-center tabular-nums">{s.noResult}</td>
                                <td className="py-2 text-right tabular-nums font-bold">{s.points}</td>
                                <td className="py-2 text-right tabular-nums">
                                    {s.netRunRate >= 0 ? '+' : ''}{s.netRunRate.toFixed(3)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
});

StandingsTable.displayName = 'StandingsTable';
