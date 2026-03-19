import { clsx } from 'clsx';

interface NextBatsmanSheetProps {
    isOpen: boolean;
    players: Array<{ id: string; name: string }>;
    alreadyBatted: string[]; // Player IDs who have already batted
    onSelect: (playerId: string) => void;
    onClose: () => void;
}

/**
 * NextBatsmanSheet — Bottom sheet for selecting the next batsman after a wicket.
 * Shows remaining batting team XI who haven't batted yet.
 * If 10th wicket (no players left), innings is over — sheet is skipped.
 */
export const NextBatsmanSheet = ({ isOpen, players, alreadyBatted, onSelect, onClose }: NextBatsmanSheetProps) => {
    if (!isOpen) return null;

    const available = players.filter(p => !alreadyBatted.includes(p.id));

    // If no batsmen available, innings over — auto-close
    if (available.length === 0) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl shadow-black/30 animate-in slide-in-from-bottom duration-200 border-t border-border max-h-[70vh] flex flex-col">
                {/* Handle */}
                <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 shrink-0" />

                {/* Header */}
                <div className="px-5 py-3 border-b border-border shrink-0">
                    <h3 className="text-base font-bold text-foreground">Select Next Batsman</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {available.length} player{available.length !== 1 ? 's' : ''} available
                    </p>
                </div>

                {/* Player List */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    <div className="flex flex-col gap-1.5">
                        {available.map((player) => (
                            <button
                                key={player.id}
                                onClick={() => onSelect(player.id)}
                                className={clsx(
                                    "flex items-center p-3 rounded-xl hover:bg-secondary border border-transparent hover:border-border",
                                    "transition-all active:scale-[0.98] text-left"
                                )}
                            >
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm mr-3 shrink-0">
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-foreground">{player.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cancel */}
                <div className="px-5 pb-5 pt-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full h-11 rounded-xl border border-border text-muted-foreground font-semibold text-sm
                                   hover:bg-secondary hover:text-foreground transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
};
