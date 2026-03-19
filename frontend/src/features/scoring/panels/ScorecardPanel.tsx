import { useScoringStore } from "../scoringStore";
import { Users } from 'lucide-react';
import { deriveCurrentScore } from "../engine/analytics/deriveCurrentScore";

export const ScorecardPanel = () => {
    const batStats = useScoringStore(s => s.getBatsmanStats());
    const bowlStats = useScoringStore(s => s.getBowlingStats());
    const matchState = useScoringStore(s => s.matchState);
    const derivedState = useScoringStore(s => s.derivedState);
    const events = useScoringStore(s => s.events);

    if (!matchState || !derivedState) return null;

    const inningsIndex = derivedState.currentInningsIndex;
    const engineInnings = derivedState.innings[inningsIndex];
    if (!engineInnings) return null;

    const battingTeam = engineInnings.battingTeamId === matchState.teamA.id ? matchState.teamA : matchState.teamB;
    const bowlingTeam = engineInnings.bowlingTeamId === matchState.teamA.id ? matchState.teamA : matchState.teamB;

    const getPlayerName = (team: any, id: string) => team.players?.find((p: any) => p.id === id)?.name || "Unknown";

    const currentScore = deriveCurrentScore(events.filter(e => e.type !== 'PHASE_CHANGE'), inningsIndex);

    return (
        <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Live Scorecard
                </h3>
                <div className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-md tracking-widest uppercase">
                    Inn {inningsIndex + 1}
                </div>
            </div>

            {/* Batting Table */}
            <div className="overflow-hidden rounded-xl bg-card border shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Batter</th>
                            <th className="px-3 py-2 text-right font-semibold">R</th>
                            <th className="px-3 py-2 text-right font-semibold">B</th>
                            <th className="px-3 py-2 text-right font-semibold">4s</th>
                            <th className="px-3 py-2 text-right font-semibold">6s</th>
                            <th className="px-3 py-2 text-right font-semibold">SR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {batStats.map(bat => {
                            const isStriker = bat.playerId === engineInnings.strikerId;
                            const isNonStriker = bat.playerId === engineInnings.nonStrikerId;
                            const isOut = bat.isOut;

                            let nameClass = "text-foreground font-medium";
                            if (isOut) nameClass = "text-muted-foreground line-through opacity-70";
                            else if (isStriker) nameClass = "text-primary font-bold";

                            return (
                                <tr key={bat.playerId} className="hover:bg-secondary/30 transition-colors">
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col">
                                            <span className={nameClass}>
                                                {getPlayerName(battingTeam, bat.playerId)}
                                                {(isStriker || isNonStriker) && <span className="text-primary ml-1">*</span>}
                                            </span>
                                            {isOut && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">OUT</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold">{bat.runs}</td>
                                    <td className="px-3 py-2 text-right text-muted-foreground">{bat.balls}</td>
                                    <td className="px-3 py-2 text-right">{bat.fours}</td>
                                    <td className="px-3 py-2 text-right">{bat.sixes}</td>
                                    <td className="px-3 py-2 text-right text-xs">
                                        {bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : "0.0"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="bg-secondary/30 px-3 py-2 text-xs flex justify-between border-t border-border/50">
                    <span className="text-muted-foreground font-medium">Extras: <strong className="text-foreground">{currentScore.extras.total}</strong> (W {currentScore.extras.wides}, NB {currentScore.extras.noBalls}, B {currentScore.extras.byes}, LB {currentScore.extras.legByes})</span>
                    <span className="font-bold text-foreground">Total: {currentScore.totalRuns}/{currentScore.totalWickets} ({currentScore.oversString})</span>
                </div>
            </div>

            {/* Bowling Table */}
            <div className="overflow-hidden rounded-xl bg-card border shadow-sm mt-2">
                <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Bowler</th>
                            <th className="px-3 py-2 text-right font-semibold">O</th>
                            <th className="px-3 py-2 text-right font-semibold">M</th>
                            <th className="px-3 py-2 text-right font-semibold">R</th>
                            <th className="px-3 py-2 text-right font-semibold">W</th>
                            <th className="px-3 py-2 text-right font-semibold">Eco</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {bowlStats.map(bowl => {
                            const isCurrent = bowl.bowlerId === engineInnings.currentBowlerId;
                            return (
                                <tr key={bowl.bowlerId} className="hover:bg-secondary/30 transition-colors">
                                    <td className="px-3 py-2">
                                        <span className={isCurrent ? "text-primary font-bold" : "text-foreground font-medium"}>
                                            {getPlayerName(bowlingTeam, bowl.bowlerId)}
                                            {isCurrent && <span className="text-primary ml-1">*</span>}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">{bowl.overs}</td>
                                    <td className="px-3 py-2 text-right text-muted-foreground">{bowl.maidens}</td>
                                    <td className="px-3 py-2 text-right">{bowl.runsConceded}</td>
                                    <td className="px-3 py-2 text-right font-bold text-destructive">{bowl.wickets}</td>
                                    <td className="px-3 py-2 text-right text-xs">
                                        {bowl.economy.toFixed(1)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

        </div>
    );
};
