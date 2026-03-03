import React from 'react';
import { clsx } from 'clsx';
import type { FormEntry } from '../profileService';

interface RecentMatchHistoryProps {
    form: FormEntry[];
}

/**
 * RecentMatchHistory — Purple bar chart with hover reveal.
 * Matches shadcn reference "Recent Form" card style.
 */
export const RecentMatchHistory: React.FC<RecentMatchHistoryProps> = React.memo(({ form }) => {
    if (form.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                <h3 className="font-semibold leading-none tracking-tight mb-4">Recent Form</h3>
                <p className="text-xs text-muted-foreground text-center py-4">No recent matches yet.</p>
            </div>
        );
    }

    const maxRuns = Math.max(...form.map(f => f.runs), 1);
    const displayForm = form.slice(0, 5); // Show max 5 bars like the reference

    return (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
                {/* Header with dot indicators */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold leading-none tracking-tight">Recent Form</h3>
                    <div className="flex gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    </div>
                </div>

                {/* Bar chart  */}
                <div className="flex items-end justify-between h-32 gap-3">
                    {displayForm.map((entry, i) => {
                        const heightPct = Math.max((entry.runs / maxRuns) * 100, 8);
                        return (
                            <div key={i} className="w-full flex flex-col items-center gap-2 group">
                                <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                                    {entry.runs}{!entry.isOut ? '*' : ''}
                                </span>
                                <div className="w-full bg-primary/20 rounded-t-md hover:bg-primary/40 transition-colors relative h-24">
                                    <div
                                        className="absolute bottom-0 w-full bg-primary rounded-t-md transition-all"
                                        style={{ height: `${heightPct}%` }}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground font-mono uppercase truncate max-w-full text-center">
                                    {entry.opponent?.length > 6
                                        ? `VS ${entry.opponent.slice(0, 4)}`
                                        : `VS ${entry.opponent}`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Match details below chart */}
            {form.length > 0 && (
                <div className="border-t border-border">
                    {form.slice(0, 5).map((entry, i) => (
                        <div
                            key={i}
                            className={clsx(
                                'flex items-center justify-between px-6 py-2.5 text-xs',
                                i < form.length - 1 && 'border-b border-border/50'
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span className={clsx(
                                    'w-1.5 h-1.5 rounded-full',
                                    entry.result === 'WIN' ? 'bg-emerald-500'
                                        : entry.result === 'TIE' ? 'bg-amber-500'
                                            : 'bg-destructive',
                                )} />
                                <span className="text-muted-foreground truncate max-w-[120px]">
                                    vs {entry.opponent}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={clsx(
                                    'font-bold tabular-nums',
                                    entry.runs >= 50 ? 'text-amber-400' : 'text-foreground',
                                )}>
                                    {entry.runs}{!entry.isOut ? '*' : ''}
                                </span>
                                <span className="text-[9px] text-muted-foreground tabular-nums">
                                    {new Date(entry.date).toLocaleDateString(undefined, {
                                        month: 'short', day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

RecentMatchHistory.displayName = 'RecentMatchHistory';
