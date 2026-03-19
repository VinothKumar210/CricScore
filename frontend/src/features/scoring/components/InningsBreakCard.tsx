import type { TeamSummary } from '../../matches/types/domainTypes';

interface InningsBreakCardProps {
    inningsNumber: number;
    battingTeam: TeamSummary;
    bowlingTeam: TeamSummary;
    score: { runs: number; wickets: number; overs: string };
    target?: number;
    topBatsmen: Array<{ name: string; runs: number; balls: number }>;
    topBowlers: Array<{ name: string; wickets: number; runs: number; overs: string }>;
    onStartNextInnings: () => void;
}

export const InningsBreakCard = ({
    inningsNumber,
    battingTeam,
    bowlingTeam,
    score,
    target,
    topBatsmen,
    topBowlers,
    onStartNextInnings
}: InningsBreakCardProps) => {
    return (
        <div className="absolute inset-0 z-50 bg-background flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center gap-6">
                
                {/* Header */}
                <div className="flex flex-col items-center gap-2">
                    <div className="uppercase tracking-widest text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full">
                        Innings Break
                    </div>
                    <h2 className="text-2xl font-black text-foreground">
                        {battingTeam.name} Innings ends
                    </h2>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center">
                    <div className="text-5xl font-black tracking-tighter text-foreground">
                        {score.runs}<span className="text-2xl text-muted-foreground font-bold">/{score.wickets}</span>
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground mt-1">
                        {score.overs} Overs
                    </div>
                </div>

                {/* Target (if 1st innings) */}
                {target && (
                    <div className="w-full bg-secondary/50 rounded-xl p-3 border border-border/50 flex flex-col items-center">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Target</span>
                        <span className="text-xl font-bold text-foreground">{target}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">for {bowlingTeam.name}</span>
                    </div>
                )}

                {/* Top Performers */}
                <div className="w-full flex flex-col gap-3 text-sm">
                    <div className="flex flex-col gap-1.5">
                        {topBatsmen.map((bat, i) => (
                            <div key={i} className="flex justify-between items-center text-foreground">
                                <span className="font-semibold">{bat.name}</span>
                                <span className="font-bold">{bat.runs} <span className="text-xs font-normal text-muted-foreground">({bat.balls})</span></span>
                            </div>
                        ))}
                    </div>
                    <div className="w-full h-px bg-border/50" />
                    <div className="flex flex-col gap-1.5">
                        {topBowlers.map((bowl, i) => (
                            <div key={i} className="flex justify-between items-center text-foreground">
                                <span className="font-semibold">{bowl.name}</span>
                                <span className="font-bold">{bowl.wickets}-{bowl.runs} <span className="text-xs font-normal text-muted-foreground">({bowl.overs})</span></span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action */}
                <button
                    onClick={onStartNextInnings}
                    className="w-full mt-2 h-14 rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider
                               shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                    Start {inningsNumber === 1 ? '2nd' : 'Next'} Innings
                </button>
            </div>
        </div>
    );
};
