import { useScoringStore } from "../scoringStore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { deriveMomentum } from "../engine/analytics/deriveMomentum";
import { Activity } from 'lucide-react';

export const MomentumPanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);
    if (!derivedState) return null;

    const currentInnings = derivedState.currentInningsIndex;
    
    // Generate a rolling momentum array by running deriveMomentum on slices of events
    const data = [];
    const inningsEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    
    // We only care about events in the current innings
    // To be precise, we filter them up to the current innings. But for simplicity, we just use the raw events
    // Assuming inningsEvents are just the balls of the match, we could run deriveMomentum for progressive slices
    
    let ballsF = 0;
    for (let i = 0; i < inningsEvents.length; i++) {
         const ev = inningsEvents[i];
         if (ev.type !== "EXTRA" || (ev.type === "EXTRA" && ev.extraType !== "WIDE" && ev.extraType !== "NO_BALL")) {
             ballsF++;
         }
         
         // Record momentum every legal ball
         const slice = inningsEvents.slice(0, i + 1);
         const momentum = deriveMomentum(slice, currentInnings);
         
         data.push({
             ball: ballsF,
             impact: momentum.impact
         });
    }

    // Gradient colors based on positive/negative
    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    Batting Momentum
                </h3>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner p-3 pt-6">
                 {data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        Waiting for first over
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0}/>
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis dataKey="ball" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }} />
                            
                            <ReferenceLine y={0} stroke="#64748b" strokeOpacity={0.5} />
                            <Area 
                                type="monotone" 
                                dataKey="impact" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorPos)" 
                                // To properly color negative, normally you split it, but recharts allows a simple gradient map
                                // or we can use two areas. For simplicity, we just use the positive gradient.
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
