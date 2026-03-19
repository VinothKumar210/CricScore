import { clsx } from 'clsx';
import type { TeamSummary } from '../../matches/types/domainTypes';

interface BowlingStats {
    playerId: string;
    overs: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
}

interface NextBowlerSheetProps {
    isOpen: boolean;
    team: TeamSummary | null;
    bowlerStats: BowlingStats[];
    previousBowlerId: string | null;
    onSelect: (playerId: string) => void;
    onClose: () => void;
}

export const NextBowlerSheet = ({
    isOpen,
    team,
    bowlerStats,
    previousBowlerId,
    onSelect,
    onClose
}: NextBowlerSheetProps) => {
    if (!isOpen || !team || !team.players) return null;

    const players = team.players;

    const getStats = (id: string) => {
        return bowlerStats.find(b => b.playerId === id);
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl shadow-black/30 animate-in slide-in-from-bottom duration-200 border-t border-border flex flex-col max-h-[85vh]">
                <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 shrink-0" />

                <div className="px-5 py-3 border-b border-border shrink-0">
                    <h3 className="text-base font-bold text-foreground">Select Next Bowler</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {team.name}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                        {players.map((player) => {
                            const stats = getStats(player.id);
                            const hasBowled = !!stats && stats.overs > 0;
                            const isConsecutive = player.id === previousBowlerId;

                            // Calculate formatted overs (e.g., 1.2)
                            const formatOvers = (balls: number) => {
                                const fullOvers = Math.floor(balls / 6);
                                const extraBalls = balls % 6;
                                return extraBalls === 0 ? `${fullOvers}` : `${fullOvers}.${extraBalls}`;
                            };

                            const figures = stats
                                ? `${stats.wickets}-${stats.runsConceded} (${formatOvers(stats.overs)})`
                                : '0-0 (0)';

                            return (
                                <button
                                    key={player.id}
                                    onClick={() => onSelect(player.id)}
                                    className={clsx(
                                        "flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98] text-left",
                                        isConsecutive
                                            ? "bg-destructive/5 hover:bg-destructive/10 border-destructive/30"
                                            : hasBowled
                                                ? "bg-card hover:bg-secondary border-border"
                                                : "bg-primary/5 hover:bg-primary/10 border-primary/20"
                                    )}
                                >
                                    <div className="flex items-center">
                                        <div className={clsx(
                                            "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm mr-3 shrink-0",
                                            isConsecutive
                                                ? "bg-destructive/10 text-destructive"
                                                : hasBowled
                                                    ? "bg-secondary text-muted-foreground"
                                                    : "bg-primary/10 text-primary"
                                        )}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                                {player.name}
                                                {isConsecutive && <span className="text-xs" title="Bowled previous over">⚠️</span>}
                                                {!hasBowled && <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">New</span>}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground font-medium">
                                                {figures}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-muted-foreground">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-5 pb-5 pt-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full h-11 rounded-xl border border-border text-muted-foreground font-semibold text-sm
                                   hover:bg-secondary hover:text-foreground transition-all active:scale-[0.98]"
                    >
                        Keep current bowler
                    </button>
                </div>
            </div>
        </>
    );
};
