import { useScoringStore } from "../scoringStore";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { deriveExtrasAnalysis } from "../engine/analytics/deriveExtrasAnalysis";
import { PlusCircle } from 'lucide-react';

export const ExtrasAnalysisPanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);

    if (!derivedState) return null;

    const data = deriveExtrasAnalysis(events, derivedState.currentInningsIndex);

    const pieData = [
        { name: 'Wides', value: data.widesRuns, color: '#3b82f6' },
        { name: 'No Balls', value: data.noBallsRuns, color: '#f59e0b' },
        { name: 'Byes', value: data.byes, color: '#10b981' },
        { name: 'Leg Byes', value: data.legByes, color: '#8b5cf6' },
        { name: 'Penalties', value: data.penalties, color: '#f43f5e' }
    ].filter(d => d.value > 0);

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-indigo-500" />
                    Extras Breakdown
                </h3>
            </div>
            
            <div className="flex-1 w-full bg-card rounded-xl shadow-inner mt-2 p-4 flex flex-col sm:flex-row items-center justify-center relative min-h-[250px]">
                {pieData.length === 0 ? (
                    <div className="text-muted-foreground text-sm font-medium text-center">
                        No extras conceded yet. Clean bowling!
                    </div>
                ) : (
                    <>
                        <div className="w-full sm:w-1/2 h-full min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }}
                                        itemStyle={{ fontSize: '13px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="w-full sm:w-1/2 flex flex-col justify-center space-y-3 mt-4 sm:mt-0 pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0">
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Total Extras: <span className="text-foreground text-lg ml-1">{data.totalExtras}</span>
                            </div>
                            {pieData.map((d, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 font-medium">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                                        {d.name}
                                    </div>
                                    <div className="font-bold">{d.value}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
