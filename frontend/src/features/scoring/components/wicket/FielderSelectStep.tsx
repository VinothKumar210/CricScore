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
                    className="text-sm text-textSecondary hover:text-textPrimary px-2 py-1 -ml-2"
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
                            className="flex items-center p-3 rounded-lg hover:bg-surface border border-transparent hover:border-border transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs mr-3">
                                {player.name.charAt(0)}
                            </div>
                            <span className={clsx(typography.bodyMd, "font-medium text-textPrimary")}>
                                {player.name}
                            </span>
                        </button>
                    ))}
                    {players.length === 0 && (
                        <div className="text-center py-8 text-textSecondary text-sm">
                            No players available in lineup
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
