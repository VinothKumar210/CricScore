import { useScoringStore } from "../scoringStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { deriveOverComparison } from "../engine/analytics/deriveOverComparison";
import { Activity } from 'lucide-react';

export const WormChartPanel = () => {
    const events = useScoringStore(s => s.events);
    const matchState = useScoringStore(s => s.matchState);
    if (!matchState) return null;

    const targetEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    const data = deriveOverComparison(targetEvents);

    const team1Name = matchState.teamA.name || "Team A";
    const team2Name = matchState.teamB.name || "Team B";

    // Recharts tooltip formatter to show wickets alongside runs if desired
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-cardAlt border shadow-lg p-3 rounded-xl text-sm">
                    <p className="font-bold mb-1 text-foreground">Over {label}</p>
                    {payload.map((entry: any, index: number) => {
                        const wktKey = entry.dataKey === 'innings1Runs' ? 'innings1Wickets' : 'innings2Wickets';
                        const w = entry.payload[wktKey];
                        return (
                            <div key={index} style={{ color: entry.color }} className="font-semibold flex items-center justify-between gap-4">
                                <span>{entry.name}:</span>
                                <span>{entry.value}{w !== null && w !== undefined ? ` / ${w}` : ''}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Worm Chart
                </h3>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl p-3 shadow-inner">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        No overs bowled yet
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis 
                                dataKey="overNumber" 
                                tick={{ fill: '#64748b', fontSize: 12 }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <YAxis 
                                tick={{ fill: '#64748b', fontSize: 12 }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                            
                            <Line 
                                type="monotone" 
                                dataKey="innings1Runs" 
                                name={team1Name} 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                dot={{ r: 3, fill: '#3b82f6' }} 
                                activeDot={{ r: 6 }} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="innings2Runs" 
                                name={team2Name} 
                                stroke="#ef4444" 
                                strokeWidth={3} 
                                dot={{ r: 3, fill: '#ef4444' }} 
                                activeDot={{ r: 6 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
