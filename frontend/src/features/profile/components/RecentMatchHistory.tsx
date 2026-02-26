import React from 'react';
import { Card } from '../../../components/ui/Card';
import { clsx } from 'clsx';
import type { FormEntry } from '../profileService';

interface RecentMatchHistoryProps {
    form: FormEntry[];
}

/**
 * RecentMatchHistory — Last 10 performances with form line.
 * Visual run bars + result indicators.
 */
export const RecentMatchHistory: React.FC<RecentMatchHistoryProps> = React.memo(({ form }) => {
    if (form.length === 0) {
        return (
            <Card padding="md">
                <h3 className="text-sm font-bold text-foreground mb-2">Recent Form</h3>
                <p className="text-xs text-muted-foreground text-center py-4">No recent matches yet.</p>
            </Card>
        );
    }

    const maxRuns = Math.max(...form.map(f => f.runs), 1);

    return (
        <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📈</span>
                <h3 className="text-sm font-bold text-foreground">Recent Form</h3>
                <span className="text-[10px] text-muted-foreground ml-auto">Last {form.length}</span>
            </div>

            {/* Visual form bar chart */}
            <div className="flex items-end gap-1 h-16 mb-3">
                {form.map((entry, i) => {
                    const heightPct = Math.max((entry.runs / maxRuns) * 100, 4);
                    const isGood = entry.runs >= 30;
                    const isGreat = entry.runs >= 50;
                    return (
                        <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-0.5"
                            title={`${entry.runs} vs ${entry.opponent}`}
                        >
                            <span className="text-[8px] text-muted-foreground tabular-nums font-bold">
                                {entry.runs}
                            </span>
                            <div
                                className={clsx(
                                    'w-full rounded-t-sm transition-all',
                                    isGreat ? 'bg-gradient-to-t from-amber-500 to-amber-400'
                                        : isGood ? 'bg-gradient-to-t from-brand to-brand/80'
                                            : 'bg-gradient-to-t from-gray-300 to-gray-200',
                                )}
                                style={{ height: `${heightPct}%`, minHeight: '2px' }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Detailed list */}
            <div className="space-y-1">
                {form.map((entry, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between px-2 py-1.5 bg-card rounded-lg
                                   text-xs"
                    >
                        <div className="flex items-center gap-2">
                            <span className={clsx(
                                'w-1.5 h-1.5 rounded-full',
                                entry.result === 'WIN' ? 'bg-primary/100'
                                    : entry.result === 'TIE' ? 'bg-amber-500'
                                        : 'bg-red-400',
                            )} />
                            <span className="text-muted-foreground truncate max-w-[100px]">
                                vs {entry.opponent}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={clsx(
                                'font-bold tabular-nums',
                                entry.runs >= 50 ? 'text-amber-600' : 'text-foreground',
                            )}>
                                {entry.runs}{!entry.isOut ? '*' : ''}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                                {new Date(entry.date).toLocaleDateString(undefined, {
                                    month: 'short', day: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
});

RecentMatchHistory.displayName = 'RecentMatchHistory';
