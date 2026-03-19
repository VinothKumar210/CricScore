import { useScoringStore } from "../scoringStore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export const WinProbPanel = () => {
    const events = useScoringStore(s => s.events);
    const matchState = useScoringStore(s => s.matchState);
    const derivedState = useScoringStore(s => s.derivedState);

    if (!matchState || !derivedState) return null;

    // Win probability is generally useful in 2nd innings
    if (derivedState.currentInningsIndex < 1) {
        return (
            <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Target Predictor
                    </h3>
                </div>
                <div className="flex-1 w-full flex items-center justify-center text-muted-foreground text-sm font-medium bg-card rounded-xl shadow-inner mt-2 p-4 text-center">
                    Win Probability is calculated during the run chase (2nd Innings).
                </div>
            </div>
        );
    }

    const firstInningsTotal = derivedState.innings[0].totalRuns;
    const targetScore = derivedState.interruption?.revisedTarget ?? (firstInningsTotal + 1);

    
    // We can use turning points to build the probability chart!
    // But TurningPoints only emits when probability *changes* by >5%.
    // To draw a continuous chart, we need a slight hack: we can just map the turning points.
    // However, the user asked for an AreaChart of Win Prob.
    // I will extract the probability tracking logic directly here instead of using TurningPoints array,
    // since we want smooth points.

    const totalMatchBalls = ((matchState as any).config?.overs || 20) * 6;
    const data = [];

    // Let's generate a quick continuous plot of batting prob
    const chaseEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    
    // Quick pure extraction on the fly for UI:
    let runs = 0;
    let ballsF = 0;
    let wkts = 0;
    let prob = 50;

    for (let i = 0; i < chaseEvents.length; i++) {
        const ev = chaseEvents[i];
        if (ev.type === "RUN") runs += ev.runs;
        else if (ev.type === "EXTRA") {
             if (ev.extraType === "WIDE" || ev.extraType === "NO_BALL") {
                 runs += 1 + (ev.additionalRuns || 0) + (ev.extraType === "NO_BALL" ? (ev.runsOffBat || 0) : 0);
             } else {
                 runs += (ev.additionalRuns || 0) + (ev.runsOffBat || 0);
             }
        }
        if (ev.type === "WICKET") wkts++;
        
        // Naive legal check
        if (ev.type !== "EXTRA" || (ev.type === "EXTRA" && ev.extraType !== "WIDE" && ev.extraType !== "NO_BALL")) {
            ballsF++;
        }

        // We only push a dot at the end of every over, or end of innings to keep chart clean
        if (ballsF % 6 === 0 || i === chaseEvents.length - 1) {
             const runsReq = Math.max(targetScore - runs, 0);
             const ballsRem = Math.max(totalMatchBalls - ballsF, 0);
             const wktsLeft = Math.max(10 - wkts, 0);

             if (runsReq <= 0) prob = 100;
             else if (ballsRem === 0 || wktsLeft === 0) prob = 0;
             else {
                 const reqR = (runsReq / ballsRem) * 6;
                 const rrP = Math.max(0, (reqR - 6) * 5);
                 const rrB = Math.max(0, (6 - reqR) * 4);
                 const bFrac = ballsRem / totalMatchBalls;
                 prob = 50 - rrP + rrB + (wktsLeft * 3.5) + (bFrac * 15) - 35;
                 prob = Math.max(2, Math.min(98, prob));
             }

             data.push({
                 over: Number((ballsF / 6).toFixed(1)),
                 battingProb: Math.round(prob),
                 bowlingProb: 100 - Math.round(prob)
             });
        }
    }

    const team1Name = matchState.teamA.name || "Team A";
    const team2Name = matchState.teamB.name || "Team B";
    
    // In Chases, battingTeamId is innings[1]
    const chaseBatTeamId = derivedState.innings[1].battingTeamId;
    const battingTeamName = chaseBatTeamId === matchState.teamA.id ? team1Name : team2Name;

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Win Predictor
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
                                <linearGradient id="colorBat" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis dataKey="over" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }} />
                            
                            <Area type="monotone" dataKey="battingProb" name={`${battingTeamName} Win %`} stroke="#818cf8" fillOpacity={1} fill="url(#colorBat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
