import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import type { TournamentFixture } from '../tournamentAdminService';

interface FixtureListProps {
    fixtures: TournamentFixture[];
    isCreator: boolean;
    tournamentId: string;
    onGenerateFixtures: (tournamentId: string) => Promise<void>;
    teamNameMap: Record<string, string>;
}

/**
 * FixtureList — Renders backend-provided fixtures.
 *
 * Rules:
 * - Does NOT compute bracket
 * - Does NOT simulate outcomes
 * - Only displays data
 * - Generate button visible only if user is creator
 */
export const FixtureList: React.FC<FixtureListProps> = React.memo(({
    fixtures,
    isCreator,
    tournamentId,
    onGenerateFixtures,
    teamNameMap,
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenError(null);
        try {
            await onGenerateFixtures(tournamentId);
        } catch (err: any) {
            setGenError(err?.message || 'Failed to generate fixtures');
        } finally {
            setIsGenerating(false);
        }
    };

    const getTeamName = (id: string | null) => {
        if (!id) return 'TBD';
        return teamNameMap[id] || id.slice(0, 8);
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            SCHEDULED: 'bg-blue-100 text-chart-1',
            IN_PROGRESS: 'bg-amber-100 text-amber-700',
            COMPLETED: 'bg-primary/15 text-primary',
        };
        return map[status] || 'bg-secondary text-foreground';
    };

    return (
        <Card padding="md">
            <div className="flex items-center justify-between mb-3">
                <h3 className={typography.headingMd}>Fixtures</h3>
                {isCreator && fixtures.length === 0 && (
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg
                                   text-xs font-medium hover:bg-primary/90 transition-colors
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {isGenerating ? 'Generating...' : 'Generate Fixtures'}
                    </button>
                )}
            </div>

            {genError && <p className="text-xs text-destructive mb-3">{genError}</p>}

            {fixtures.length === 0 && (
                <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                        {isCreator
                            ? 'No fixtures yet. Click "Generate Fixtures" to create the schedule.'
                            : 'Fixtures have not been generated yet.'
                        }
                    </p>
                </div>
            )}

            {fixtures.length > 0 && (
                <div className="space-y-2">
                    {fixtures.map(f => (
                        <div
                            key={f.id}
                            className="flex items-center justify-between px-3 py-2.5 bg-card rounded-lg
                                       border border-border/50"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-mono w-6">
                                    #{f.matchNumber}
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {getTeamName(f.homeTeamId)}
                                </span>
                                <span className="text-xs text-muted-foreground">vs</span>
                                <span className="text-sm font-medium text-foreground">
                                    {getTeamName(f.awayTeamId)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">R{f.round}</span>
                                <span className={clsx(
                                    'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                                    statusBadge(f.status),
                                )}>
                                    {f.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
});

FixtureList.displayName = 'FixtureList';
