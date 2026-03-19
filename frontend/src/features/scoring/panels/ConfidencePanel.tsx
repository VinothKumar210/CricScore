import { useScoringStore } from "../scoringStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame } from 'lucide-react';

export const ConfidencePanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);
    const matchState = useScoringStore(s => s.matchState);

    if (!derivedState || !matchState) return null;

    const currentInnings = derivedState.innings[derivedState.currentInningsIndex];
    if (!currentInnings || !currentInnings.strikerId) return null;

    const strikerId = currentInnings.strikerId;
    const batsmanEvents = events.filter(e => e.batsmanId === strikerId && e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');

    let confidence = 50; // start at neutral 50%
    const data = [];

    // Rolling confidence calculation
    let ballsFaced = 0;
    for (const ev of batsmanEvents) {
        let batRuns = 0;
        let faced = false;

        if (ev.type === "RUN") {
            batRuns = ev.runs;
            faced = true;
        } else if (ev.type === "EXTRA" && ev.extraType === "NO_BALL") {
            batRuns = ev.runsOffBat || 0;
            faced = true;
        }

        if (faced) {
            ballsFaced++;
            if (batRuns === 0) confidence -= 2;
            else if (batRuns === 1) confidence += 0.5;
            else if (batRuns === 2 || batRuns === 3) confidence += 2;
            else if (batRuns === 4) confidence += 5;
            else if (batRuns === 6) confidence += 8;
            
            // Constrain 0-100
            confidence = Math.max(0, Math.min(100, confidence));

            data.push({
                ball: ballsFaced,
                confidence: Number(confidence.toFixed(1))
            });
        }
    }

    const getPlayerName = (teamId: string | undefined, playerId: string) => {
        if (!teamId) return playerId;
        const team = matchState.teamA.id === teamId ? matchState.teamA : matchState.teamB;
        return team.players?.find((p: any) => p.id === playerId)?.name || "Unknown";
    };

    const strikerName = getPlayerName(currentInnings.battingTeamId, strikerId);

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Batsman Confidence
                </h3>
                <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase bg-secondary/50 px-2 py-1 rounded-md">
                    {strikerName}
                </span>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner p-3 pt-6 flex flex-col items-center">
                 {data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        Waiting for first delivery
                    </div>
                ) : (
                    <>
                        <div className="absolute top-2 right-4 text-2xl font-black text-orange-500 opacity-20">
                            {confidence.toFixed(0)}%
                        </div>
                        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                            <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                <XAxis dataKey="ball" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }} />
                                
                                <Line 
                                    type="monotone" 
                                    dataKey="confidence" 
                                    name="Confidence" 
                                    stroke="#f97316" 
                                    strokeWidth={3} 
                                    dot={false}
                                    activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </>
                )}
            </div>
        </div>
    );
};
