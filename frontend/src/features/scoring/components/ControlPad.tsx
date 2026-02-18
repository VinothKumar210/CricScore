import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { useScoringStore } from '../scoringStore';

export const ControlPad = () => {
    const { recordBall, undo, isSubmitting, matchState } = useScoringStore();

    // Disable if submitting or match is not live
    const isMatchLive = matchState?.status === 'LIVE';
    const isDisabled = isSubmitting || !isMatchLive;

    const handleRun = (runs: number) => {
        recordBall({ type: 'DELIVER_BALL', runs });
    };

    const handleExtra = (extraType: string) => {
        // Defaulting to 1 run for extras as per common scoring rules (sub-rules can be handled in backend/store later)
        recordBall({ type: 'DELIVER_BALL', extraType, runs: 1 });
    };

    const handleWicket = () => {
        recordBall({ type: 'WICKET' });
    };

    return (
        <div className="relative p-3 bg-surface rounded-xl border border-border shadow-sm">
            {/* Spinner Overlay Indicator */}
            {isSubmitting && (
                <div className="absolute top-2 right-2 text-brand animate-spin z-10 pointer-events-none">
                    <Loader2 size={16} />
                </div>
            )}

            {/* Grid Container */}
            <div
                className={clsx(
                    "grid grid-cols-3 gap-2 transition-opacity duration-200",
                    isDisabled && "opacity-50 pointer-events-none cursor-not-allowed"
                )}
            >
                {/* Row 1: Runs (0, 1, 2, 3, 4, 6) */}
                {[0, 1, 2, 3, 4, 6].map((run) => (
                    <PadButton key={run} onClick={() => handleRun(run)}>
                        {run}
                    </PadButton>
                ))}

                {/* Row 2: Extras (WD, NB, LB, B) */}
                <PadButton onClick={() => handleExtra('WD')} variant="secondary">WD</PadButton>
                <PadButton onClick={() => handleExtra('NB')} variant="secondary">NB</PadButton>
                <PadButton onClick={() => handleExtra('LB')} variant="secondary">LB</PadButton>

                {/* Row 3: Events (B grouped here to flow, then WICKET, UNDO) */}
                <PadButton onClick={() => handleExtra('B')} variant="secondary">B</PadButton>
                <PadButton onClick={handleWicket} variant="danger" className="text-white">WICKET</PadButton>
                <PadButton onClick={undo} variant="muted">UNDO</PadButton>

                {/* Row 4: Ops (Swap, Retire) */}
                {/* Empty slot or footer actions could go here, currently strictly adding per spec */}
                <PadButton variant="outline" className="text-xs">Swap</PadButton>
                <PadButton variant="outline" className="text-xs">Retire</PadButton>
                {/* Fill last slot to keep grid balanced or leave empty */}
                <div />
            </div>
        </div>
    );
};

// Internal Sub-component for buttons
interface PadButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'muted' | 'outline';
}

const PadButton = ({ children, className, variant = 'primary', ...props }: PadButtonProps) => {
    const baseStyles = "h-14 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center shadow-sm select-none";

    const variants = {
        primary: "bg-white border border-border text-textPrimary hover:bg-gray-50 active:bg-gray-100",
        secondary: "bg-surface border border-border text-textSecondary hover:bg-gray-100 active:bg-gray-200", // Extras
        danger: "bg-danger border border-danger text-white hover:bg-danger/90 active:bg-danger/80", // Wicket
        muted: "bg-gray-200 border border-gray-300 text-textSecondary hover:bg-gray-300 active:bg-gray-400", // Undo
        outline: "bg-transparent border border-border text-textSecondary border-dashed hover:bg-surface" // Ops
    };

    return (
        <button
            className={clsx(baseStyles, variants[variant], className)}
            type="button"
            {...props}
        >
            {children}
        </button>
    );
};
