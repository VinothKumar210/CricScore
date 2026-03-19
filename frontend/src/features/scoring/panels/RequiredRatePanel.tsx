import { useScoringStore } from "../scoringStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { deriveRequiredRateProgression } from "../engine/analytics/deriveRequiredRateProgression";
import { LineChart as LineChartIcon } from 'lucide-react';

export const RequiredRatePanel = () => {
    const events = useScoringStore(s => s.events);
    const matchState = useScoringStore(s => s.matchState);
    const derivedState = useScoringStore(s => s.derivedState);

    if (!matchState || !derivedState) return null;

    if (derivedState.currentInningsIndex < 1) {
        return (
            <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                        <LineChartIcon className="w-5 h-5 text-rose-500" />
                        RRR Progression
                    </h3>
                </div>
                 <div className="flex-1 w-full flex items-center justify-center text-muted-foreground text-sm font-medium bg-card rounded-xl shadow-inner mt-2 p-4 text-center">
                    Required Run Rate is established in the 2nd Innings.
                </div>
            </div>
        );
    }

    const firstInningsTotal = derivedState.innings[0].totalRuns;
    const targetScore = derivedState.interruption?.revisedTarget ?? (firstInningsTotal + 1);

    const targetEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    const totalMatchOvers = (matchState as any).config?.overs || 20;
    const data = deriveRequiredRateProgression(targetEvents, targetScore, totalMatchOvers);

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <LineChartIcon className="w-5 h-5 text-rose-500" />
                    RRR Progression
                </h3>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner p-3 pt-6">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        Waiting for first over
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis dataKey="overNumber" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }} />
                            
                            <Line type="monotone" dataKey="rrr" name="Required Rate" stroke="#f43f5e" strokeWidth={3} dot={{ r: 2, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
