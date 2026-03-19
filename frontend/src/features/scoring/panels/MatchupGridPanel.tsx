import { useScoringStore } from "../scoringStore";
import { deriveBatsmanVsBowler } from "../engine/analytics/deriveBatsmanVsBowler";
import { Swords } from 'lucide-react';

export const MatchupGridPanel = () => {
    const events = useScoringStore(s => s.events);
    const matchState = useScoringStore(s => s.matchState);
    const derivedState = useScoringStore(s => s.derivedState);

    if (!matchState || !derivedState) return null;

    const inningsEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    const matchups = deriveBatsmanVsBowler(inningsEvents);
    const matchupList = Object.values(matchups).filter(m => m.balls > 0).sort((a, b) => b.runs - a.runs).slice(0, 5); // top 5 matchups

    // Helper to resolve names
    const getPlayerName = (teamId: string | undefined, playerId: string) => {
        if (!teamId) return playerId;
        const team = matchState.teamA.id === teamId ? matchState.teamA : matchState.teamB;
        return team.players?.find((p: any) => p.id === playerId)?.name || "Unknown";
    };

    const currentInnings = derivedState.innings[derivedState.currentInningsIndex];
    const batTeamId = currentInnings.battingTeamId;
    const bowlTeamId = currentInnings.bowlingTeamId;

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Swords className="w-5 h-5 text-indigo-500" />
                    Key Matchups
                </h3>
            </div>
            
            <div className="flex-1 w-full bg-card rounded-xl shadow-inner mt-2 overflow-hidden border">
                {matchupList.length === 0 ? (
                     <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-medium p-4 text-center">
                        Waiting for action to build matchups
                    </div>
                ) : (
                    <div className="overflow-x-auto h-full">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">Batter</th>
                                    <th className="px-3 py-2 text-left font-semibold">Bowler</th>
                                    <th className="px-3 py-2 text-right font-semibold">R</th>
                                    <th className="px-3 py-2 text-right font-semibold">B</th>
                                    <th className="px-3 py-2 text-right font-semibold">SR</th>
                                    <th className="px-3 py-2 text-right font-semibold">Outs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {matchupList.map((m, i) => {
                                    const sr = m.balls > 0 ? ((m.runs / m.balls) * 100).toFixed(0) : 0;
                                    return (
                                        <tr key={i} className="hover:bg-secondary/30 transition-colors">
                                            <td className="px-3 py-2 text-foreground font-medium truncate max-w-[80px]">
                                                {getPlayerName(batTeamId, m.batsmanId)}
                                            </td>
                                            <td className="px-3 py-2 text-foreground font-medium truncate max-w-[80px]">
                                                {getPlayerName(bowlTeamId, m.bowlerId)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-emerald-500">{m.runs}</td>
                                            <td className="px-3 py-2 text-right">{m.balls}</td>
                                            <td className="px-3 py-2 text-right text-muted-foreground">{sr}</td>
                                            <td className={`px-3 py-2 text-right font-bold ${m.dismissals > 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>{m.dismissals}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
