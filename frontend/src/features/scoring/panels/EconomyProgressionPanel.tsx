import { useScoringStore } from "../scoringStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { deriveEconomyProgression } from "../engine/analytics/deriveEconomyProgression";
import { TrendingDown } from 'lucide-react';

export const EconomyProgressionPanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);
    const matchState = useScoringStore(s => s.matchState);

    if (!derivedState || !matchState) return null;

    const currentInnings = derivedState.innings[derivedState.currentInningsIndex];
    if (!currentInnings || !currentInnings.currentBowlerId) {
        return (
            <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-teal-500" />
                        Current Bowler Economy
                    </h3>
                </div>
                <div className="flex-1 w-full flex items-center justify-center text-muted-foreground text-sm font-medium bg-card rounded-xl shadow-inner mt-2 p-4 text-center">
                    Waiting for bowler to start
                </div>
            </div>
        );
    }

    const bowlerId = currentInnings.currentBowlerId;
    const data = deriveEconomyProgression(events, bowlerId);

    const getPlayerName = (teamId: string | undefined, playerId: string) => {
        if (!teamId) return playerId;
        const team = matchState.teamA.id === teamId ? matchState.teamA : matchState.teamB;
        return team.players?.find((p: any) => p.id === playerId)?.name || "Unknown";
    };

    const bowlerName = getPlayerName(currentInnings.bowlingTeamId, bowlerId);

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-teal-500" />
                    Economy Progression
                </h3>
                <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase bg-secondary/50 px-2 py-1 rounded-md">
                    {bowlerName}
                </span>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner p-3 pt-6">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        Waiting for first delivery
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis dataKey="overNumber" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }} />
                            
                            <Line type="stepAfter" dataKey="economy" name="Economy Rate" stroke="#14b8a6" strokeWidth={3} dot={{ r: 3, fill: '#14b8a6' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
