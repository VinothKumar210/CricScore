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
            <div className="flex items-center justify-center h-screen bg-bgPrimary">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    // Error
    if (error && !matchState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-bgPrimary p-4">
                <p className="text-destructive font-semibold mb-2">Failed to load match</p>
                <button
                    onClick={() => matchId && initialize(matchId)}
                    className="px-4 py-2 bg-primary text-white rounded-lg"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!matchId) return <Navigate to="/home" />;

    return (
        <div className="flex flex-col h-full bg-bgPrimary max-w-md mx-auto shadow-2xl overflow-hidden relative">
            {/* Shared Shell: ScorePanel + OverTimeline + Stats */}
            <MatchLiveShell />

            {/* Footer: Scorer-only Control Pad */}
            <div className="flex-none p-2 bg-card border-t border-border pb-safe-area">
                <ControlPad />
            </div>

            {/* Global Error Toast */}
            {error && (
                <div className="absolute top-20 left-4 right-4 bg-destructive text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 z-50 flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={() => useScoringStore.getState().refetch()}
                        className="bg-card/20 hover:bg-card/30 px-2 py-1 rounded text-xs ml-2"
                    >
                        Refresh
                    </button>
                </div>
            )}
        </div>
    );
};
