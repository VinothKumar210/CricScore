import { useEffect } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { useShallow } from 'zustand/react/shallow';

interface UndoBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * UndoBottomSheet — Premium confirmation sheet for undoing last ball.
 * Dark backdrop + slide-up card with ball preview.
 */
export const UndoBottomSheet = ({ isOpen, onClose }: UndoBottomSheetProps) => {
    const { undo, isSubmitting, syncState, lastBall } = useScoringStore(
        useShallow((s) => ({
            undo: s.undo,
            isSubmitting: s.isSubmitting,
            syncState: s.syncState,
            lastBall: s.getLastBall(),
        }))
    );
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
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl p-5 shadow-2xl shadow-black/30 animate-in slide-in-from-bottom duration-200 border-t border-border">
                {/* Handle */}
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <AlertTriangle size={20} className="text-amber-400" />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Undo Last Ball?</h3>
                    <p className="text-sm text-muted-foreground mt-1">This action cannot be reversed</p>

                    {lastBall ? (
                        <div className="bg-secondary rounded-xl p-4 mt-4 inline-block min-w-[220px] border border-border">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">
                                Over {lastBall.overNumber}
                            </div>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl font-black tabular-nums text-foreground">
                                    {lastBall.label}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-card rounded-full border border-border">
                                    {lastBall.type}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground mt-4">No ball available to undo.</p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl border border-border font-semibold text-foreground bg-card hover:bg-secondary active:scale-[0.98] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canUndo}
                        className={clsx(
                            "flex-1 h-12 rounded-xl font-semibold text-destructive-foreground shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2",
                            !canUndo
                                ? "bg-destructive/30 cursor-not-allowed"
                                : "bg-destructive hover:bg-destructive/90 shadow-destructive/20"
                        )}
                    >
                        <RotateCcw className="w-4 h-4" />
                        Confirm Undo
                    </button>
                </div>
            </div>
        </>
    );
};
