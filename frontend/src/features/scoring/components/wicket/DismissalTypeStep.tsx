import type { DismissalType } from '../../../matches/types/domainTypes';
import { clsx } from 'clsx';

interface DismissalTypeStepProps {
    onSelect: (type: DismissalType) => void;
    isFreeHit?: boolean;
}

const DISMISSAL_TYPES: { type: DismissalType; label: string; icon: string }[] = [
    { type: "BOWLED", label: "Bowled", icon: "🏏" },
    { type: "CAUGHT", label: "Caught", icon: "🤲" },
    { type: "LBW", label: "LBW", icon: "🦵" },
    { type: "RUN_OUT", label: "Run Out", icon: "🏃" },
    { type: "STUMPED", label: "Stumped", icon: "🧤" },
    { type: "HIT_WICKET", label: "Hit Wicket", icon: "💥" },
    { type: "RETIRED_HURT", label: "Retired Hurt", icon: "🩹" },
    { type: "RETIRED_OUT", label: "Retired Out", icon: "🚶" },
    { type: "OBSTRUCTING_FIELD", label: "Obstructing", icon: "🚫" },
];

// On a free hit, only RunOut and Obstructing are valid dismissals
const FREE_HIT_VALID: DismissalType[] = ["RUN_OUT", "OBSTRUCTING_FIELD"];

export const DismissalTypeStep = ({ onSelect, isFreeHit = false }: DismissalTypeStepProps) => {
    const handleSelect = (type: DismissalType) => {
        if (isFreeHit && !FREE_HIT_VALID.includes(type)) {
            // Could show a toast here; for now silently ignore
            return;
        }
        onSelect(type);
    };

    return (
        <div className="space-y-3">
            {isFreeHit && (
                <div className="bg-amber-500/10 text-amber-400 text-xs px-3 py-2 rounded-lg border border-amber-500/20 font-medium text-center">
                    🔶 Free Hit — Only Run Out & Obstructing are valid
                </div>
            )}
            <div className="grid grid-cols-3 gap-2">
                {DISMISSAL_TYPES.map(({ type, label, icon }) => {
                    const isDisabledByFH = isFreeHit && !FREE_HIT_VALID.includes(type);
                    return (
                        <button
                            key={type}
                            onClick={() => handleSelect(type)}
                            disabled={isDisabledByFH}
                            className={clsx(
                                "p-3 rounded-xl border bg-card hover:bg-secondary active:scale-[0.96] transition-all",
                                "flex flex-col items-center justify-center gap-1 h-20",
                                isDisabledByFH
                                    ? "opacity-25 cursor-not-allowed border-border/30"
                                    : "border-border"
                            )}
                        >
                            <span className="text-xl">{icon}</span>
                            <span className="text-[11px] font-semibold text-foreground">{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
