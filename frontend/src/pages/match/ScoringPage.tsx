import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useScoringStore } from '../../features/scoring/scoringStore';
import { useScoringSocket } from '../../features/scoring/useScoringSocket';
import { MatchLiveShell } from '../../features/scoring/components/MatchLiveShell';
import { ControlPad } from '../../features/scoring/components/ControlPad';
import { Loader2 } from 'lucide-react';

export const ScoringPage = () => {
    const { id: matchId } = useParams<{ id: string }>();
    const initialize = useScoringStore((s) => s.initialize);
    const matchState = useScoringStore((s) => s.matchState);
    const error = useScoringStore((s) => s.error);

    // 1. Initialize Store
    useEffect(() => {
        if (matchId) {
            initialize(matchId);
        }
    }, [matchId, initialize]);

    // 2. Connect Socket
    useScoringSocket(matchId || null);

    // Loading
    if (!matchState && !error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground font-medium">Loading match...</span>
            </div>
        );
    }

    // Error
    if (error && !matchState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background p-4 gap-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                </div>
                <div className="text-center">
                    <p className="text-foreground font-semibold mb-1">Failed to load match</p>
                    <p className="text-muted-foreground text-sm max-w-xs">{error}</p>
                </div>
                <button
                    onClick={() => matchId && initialize(matchId)}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold
                               hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!matchId) return <Navigate to="/home" />;

    return (
        <div className="flex flex-col h-full bg-background max-w-md mx-auto shadow-2xl overflow-hidden relative">
            {/* Shared Shell: ScorePanel + OverTimeline + Stats */}
            <MatchLiveShell />

            {/* Footer: Scorer Control Pad */}
            <div className="flex-none p-2 bg-card/80 backdrop-blur-xl border-t border-border pb-safe-area">
                <ControlPad />
            </div>

            {/* Global Error Toast */}
            {error && (
                <div className="absolute top-20 left-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-lg shadow-destructive/20 text-sm font-medium z-50 flex justify-between items-center animate-in fade-in slide-in-from-top-2 border border-destructive/30">
                    <span>{error}</span>
                    <button
                        onClick={() => useScoringStore.getState().refetch()}
                        className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-xs font-semibold ml-3 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            )}
        </div>
    );
};
