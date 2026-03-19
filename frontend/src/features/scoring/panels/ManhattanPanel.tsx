import { useScoringStore } from "../scoringStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { deriveManhattanChart } from "../engine/analytics/deriveManhattanChart";
import { BarChart3 } from 'lucide-react';

export const ManhattanPanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);
    if (!derivedState) return null;

    const targetEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    const data = deriveManhattanChart(targetEvents, derivedState.currentInningsIndex);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-cardAlt border shadow-lg p-3 rounded-xl text-sm min-w-[120px]">
                    <p className="font-bold mb-1 text-foreground">Over {label}</p>
                    <div className="flex justify-between text-muted-foreground items-center">
                        <span>Runs</span>
                        <span className="font-bold text-foreground">{data.runs}</span>
                    </div>
                    {data.wickets > 0 && (
                        <div className="flex justify-between text-destructive items-center mt-1 pt-1 border-t border-destructive/20">
                            <span>Wickets</span>
                            <span className="font-bold">{data.wickets}</span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                    Manhattan
                </h3>
                <div className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-md tracking-widest uppercase">
                    Inn {derivedState.currentInningsIndex + 1}
                </div>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner p-3 pt-6">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        Waiting for first over
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
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
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            
                            <Bar dataKey="runs" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.wickets > 0 ? '#ef4444' : '#10b981'} 
                                        fillOpacity={0.8}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div>Runs</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-destructive"></div>Wickets</span>
            </div>
        </div>
    );
};
