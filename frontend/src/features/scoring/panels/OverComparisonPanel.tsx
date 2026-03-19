import { useScoringStore } from "../scoringStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { deriveOverComparison } from "../engine/analytics/deriveOverComparison";
import { GitCompareArrows } from 'lucide-react';

export const OverComparisonPanel = () => {
    const events = useScoringStore(s => s.events);
    const matchState = useScoringStore(s => s.matchState);
    if (!matchState) return null;

    const targetEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    const rawData = deriveOverComparison(targetEvents);

    // deriveOverComparison is cumulative. 
    // To show per-over grouped bars, we need to decumulate it.
    const decumulatedData = rawData.map((d, i) => {
        const prev = i > 0 ? rawData[i - 1] : { innings1Runs: 0, innings2Runs: 0 };
        return {
            overNumber: d.overNumber,
            inn1Runs: d.innings1Runs - prev.innings1Runs,
            inn2Runs: d.innings2Runs !== null ? d.innings2Runs - (prev.innings2Runs || 0) : null
        };
    });

    const team1Name = matchState.teamA.name || "Team A";
    const team2Name = matchState.teamB.name || "Team B";

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
             <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <GitCompareArrows className="w-5 h-5 text-amber-500" />
                    Over Comparison
                </h3>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner p-3 pt-4">
                {decumulatedData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        No overs bowled yet
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={decumulatedData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis 
                                dataKey="overNumber" 
                                tick={{ fill: '#64748b', fontSize: 11 }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <YAxis 
                                tick={{ fill: '#64748b', fontSize: 11 }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip 
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                            
                            <Bar dataKey="inn1Runs" name={team1Name} fill="#3b82f6" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="inn2Runs" name={team2Name} fill="#ef4444" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
