import { clsx } from 'clsx';
import { typography } from '../../../../constants/typography';

interface FielderSelectStepProps {
    players: Array<{ id: string; name: string }>;
    onSelect: (playerId: string) => void;
    onBack: () => void;
}

export const FielderSelectStep = ({ players, onSelect, onBack }: FielderSelectStepProps) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center mb-4">
                <button
                    onClick={onBack}
                    className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 -ml-2"
                >
                    ← Back
                </button>
                <h3 className={clsx(typography.headingMd, "ml-2")}>Select Fielder</h3>
            </div>

            <div className="flex-1 overflow-y-auto -mx-4 px-4">
                <div className="flex flex-col gap-2">
                    {players.map((player) => (
                        <button
                            key={player.id}
                            onClick={() => onSelect(player.id)}
                            className="flex items-center p-3 rounded-lg hover:bg-card border border-transparent hover:border-border transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs mr-3">
                                {player.name.charAt(0)}
                            </div>
                            <span className={clsx(typography.bodyMd, "font-medium text-foreground")}>
                                {player.name}
                            </span>
                        </button>
                    ))}
                    {players.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No players available in lineup
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
