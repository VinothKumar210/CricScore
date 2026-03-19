import { useScoringStore } from "../scoringStore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { deriveBoundaries } from "../engine/analytics/deriveBoundaries";
import { CircleDashed } from 'lucide-react';

export const BoundaryPercentPanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);

    if (!derivedState) return null;

    const data = deriveBoundaries(events, derivedState.currentInningsIndex);

    const pieData = [
        { name: 'Boundaries (4s & 6s)', value: data.boundaryRuns, color: '#f43f5e' },
        { name: 'Running', value: data.runningBetweenWicketsRuns, color: '#10b981' }
    ].filter(d => d.value > 0);

    // If there's 0 total runs, pieData might be empty but we show a placeholder
    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <CircleDashed className="w-5 h-5 text-rose-500" />
                    Boundary Percentage
                </h3>
            </div>
            
            <div className="flex-1 w-full bg-card rounded-xl shadow-inner mt-2 relative p-4 flex flex-col justify-center min-h-[250px]">
                {data.totalRuns === 0 ? (
                    <div className="text-muted-foreground text-sm font-medium text-center">
                        Awaiting first runs...
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-row items-center">
                        <div className="w-1/2 h-full relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-xl font-black text-rose-500 leading-none">
                                    {data.boundaryPercentage.toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        <div className="w-1/2 flex flex-col justify-center space-y-4 pl-4 border-l">
                            <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
                                <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 border border-rose-400"></div> Boundaries
                                </div>
                                <div className="text-lg font-black text-foreground">{data.totalFours}x4 <span className="text-muted-foreground font-normal text-sm mx-1">|</span> {data.totalSixes}x6</div>
                                <div className="text-xs font-medium text-muted-foreground mt-1">{data.boundaryRuns} runs</div>
                            </div>
                            
                            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                     <div className="w-2 h-2 rounded-full bg-emerald-500 border border-emerald-400"></div> Running
                                </div>
                                <div className="text-lg font-black text-foreground">{data.runningPercentage.toFixed(0)}%</div>
                                <div className="text-xs font-medium text-muted-foreground mt-1">{data.runningBetweenWicketsRuns} runs</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
