import { useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { typography } from '../../../constants/typography';

interface UndoBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UndoBottomSheet = ({ isOpen, onClose }: UndoBottomSheetProps) => {
    const { undo, isSubmitting, syncState, getLastBall } = useScoringStore();

    // Get the last ball details to show what we are undoing
    // We use a selector or specific store call. 
    // Note: getLastBall returns { ...ball, overNumber }
    const lastBall = useScoringStore(s => s.getLastBall());
    const canUndo = !!lastBall && !isSubmitting && syncState === 'IDLE';

    const handleConfirm = async () => {
        if (!canUndo) return;
        await undo();
        onClose();
    };

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-4 shadow-xl animate-in slide-in-from-bottom duration-200">
                {/* Handle / Drag Indicator (Visual only) */}
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2 text-textPrimary">
                        <AlertTriangle size={20} className="text-warning" />
                        <h3 className={clsx(typography.headingMd)}>Undo Last Ball?</h3>
                    </div>

                    {lastBall ? (
                        <div className="bg-surface rounded-lg p-3 inline-block min-w-[200px]">
                            <div className="text-xs text-textSecondary uppercase tracking-wide mb-1">
                                Over {lastBall.overNumber}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span className={clsx(typography.headingXl, "font-bold tabular-nums")}>
                                    {lastBall.label}
                                </span>
                                <span className="text-sm text-textSecondary font-medium">
                                    ({lastBall.type})
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-textSecondary">No ball available to undo.</p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl border border-border font-semibold text-textPrimary hover:bg-surface active:scale-[0.98] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canUndo}
                        className={clsx(
                            "flex-1 h-11 rounded-xl font-semibold text-white shadow-sm active:scale-[0.98] transition-all",
                            !canUndo ? "bg-danger/50 cursor-not-allowed" : "bg-danger hover:bg-danger/90"
                        )}
                    >
                        Confirm Undo
                    </button>
                </div>
            </div>
        </>
    );
};
