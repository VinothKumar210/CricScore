import { clsx } from 'clsx';
import { typography } from '../../../../constants/typography';

interface NewBatsmanStepProps {
    players: Array<{ id: string; name: string }>;
    onSelect: (playerId: string) => void;
    onBack: () => void;
    isSubmitting: boolean;
}

export const NewBatsmanStep = ({ players, onSelect, onBack, isSubmitting }: NewBatsmanStepProps) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center mb-4">
                <button
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 -ml-2 disabled:opacity-50"
                >
                    ← Back
                </button>
                <h3 className={clsx(typography.headingMd, "ml-2")}>Select New Batsman</h3>
            </div>

            <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-20">
                <div className="flex flex-col gap-2">
                    {players.map((player) => (
                        <button
                            key={player.id}
                            onClick={() => onSelect(player.id)}
                            disabled={isSubmitting}
                            className="flex items-center p-3 rounded-lg hover:bg-card border border-transparent hover:border-border transition-colors text-left disabled:opacity-50"
                        >
                            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xs mr-3">
                                {player.name.charAt(0)}
                            </div>
                            <span className={clsx(typography.bodyMd, "font-medium text-foreground")}>
                                {player.name}
                            </span>
                        </button>
                    ))}
                    {players.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No players available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
