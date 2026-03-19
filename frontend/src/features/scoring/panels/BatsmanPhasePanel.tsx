import { useScoringStore } from "../scoringStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { deriveBatsmanPhaseRate } from "../engine/analytics/deriveBatsmanPhaseRate";
import { BarChart2 } from 'lucide-react';

export const BatsmanPhasePanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);
    const matchState = useScoringStore(s => s.matchState);

    if (!derivedState || !matchState) return null;

    const currentInnings = derivedState.innings[derivedState.currentInningsIndex];
    if (!currentInnings || (!currentInnings.strikerId && !currentInnings.nonStrikerId)) {
        return null;
    }

    // Combine striker and non striker data or just show Striker
    const strikerId = currentInnings.strikerId;
    if (!strikerId) return null;

    const dataObj = deriveBatsmanPhaseRate(events, strikerId);
    
    // Calculate SRs
    const calcSR = (runs: number, balls: number) => balls > 0 ? Number(((runs / balls) * 100).toFixed(0)) : 0;

    const data = [
        {
            phase: 'Powerplay',
            Runs: dataObj.powerplay.runs,
            SR: calcSR(dataObj.powerplay.runs, dataObj.powerplay.balls)
        },
        {
            phase: 'Middle',
            Runs: dataObj.middleOvers.runs,
            SR: calcSR(dataObj.middleOvers.runs, dataObj.middleOvers.balls)
        },
        {
            phase: 'Death',
            Runs: dataObj.deathOvers.runs,
            SR: calcSR(dataObj.deathOvers.runs, dataObj.deathOvers.balls)
        }
    ].filter(d => d.Runs > 0 || d.SR > 0);

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
                    <BarChart2 className="w-5 h-5 text-purple-500" />
                    Phase Breakdown
                </h3>
                <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase bg-secondary/50 px-2 py-1 rounded-md">
                    {strikerName}
                </span>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner p-3 pt-6">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        Waiting for striker to score
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="phase" type="category" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={70} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }} cursor={{ fill: '#334155', opacity: 0.2 }} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                            
                            <Bar dataKey="Runs" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} />
                            <Bar dataKey="SR" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
