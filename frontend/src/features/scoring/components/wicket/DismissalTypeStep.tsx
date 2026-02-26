import type { DismissalType } from '../../../matches/types/domainTypes';
import { clsx } from 'clsx';
import { typography } from '../../../../constants/typography';

interface DismissalTypeStepProps {
    onSelect: (type: DismissalType) => void;
}

const DISMISSAL_TYPES: { type: DismissalType; label: string }[] = [
    { type: "BOWLED", label: "Bowled" },
    { type: "CAUGHT", label: "Caught" },
    { type: "LBW", label: "LBW" },
    { type: "RUN_OUT", label: "Run Out" },
    { type: "STUMPED", label: "Stumped" },
    { type: "HIT_WICKET", label: "Hit Wicket" },
    { type: "RETIRED_OUT", label: "Retired" },
];

export const DismissalTypeStep = ({ onSelect }: DismissalTypeStepProps) => {
    return (
        <div className="grid grid-cols-2 gap-3">
            {DISMISSAL_TYPES.map(({ type, label }) => (
                <button
                    key={type}
                    onClick={() => onSelect(type)}
                    className={clsx(
                        "p-4 rounded-xl border border-border bg-card hover:bg-background active:scale-[0.98] transition-all",
                        "text-left flex flex-col justify-center h-20"
                    )}
                >
                    <span className={clsx(typography.bodyMd, "font-semibold text-foreground")}>{label}</span>
                </button>
            ))}
        </div>
    );
};
