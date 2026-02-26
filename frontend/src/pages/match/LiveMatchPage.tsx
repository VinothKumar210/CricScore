import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useScoringStore } from '../../features/scoring/scoringStore';
import { useScoringSocket } from '../../features/scoring/useScoringSocket';
import { MatchLiveShell } from '../../features/scoring/components/MatchLiveShell';
import { Loader2, Share2, Check } from 'lucide-react';
import { useState } from 'react';

/**
 * LiveMatchPage — read-only spectator view.
 * Connects to socket for live updates, renders MatchLiveShell.
 * NO scoring actions, NO ControlPad, NO mutations.
 */
export const LiveMatchPage = () => {
    const { id: matchId } = useParams<{ id: string }>();
    const initialize = useScoringStore((s) => s.initialize);
    const matchState = useScoringStore((s) => s.matchState);
    const error = useScoringStore((s) => s.error);
    const [copied, setCopied] = useState(false);

    // Initialize store (read-only — no mutations)
    useEffect(() => {
        if (matchId) {
            initialize(matchId);
        }
    }, [matchId, initialize]);

    // Subscribe to live socket updates
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

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback: prompt
        }
    };

    return (
        <div className="flex flex-col h-full bg-bgPrimary max-w-md mx-auto shadow-2xl overflow-hidden relative">
            <MatchLiveShell />

            {/* Share FAB */}
            <button
                onClick={handleShare}
                className="fixed top-4 right-4 z-50 bg-primary text-white p-2.5 rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95"
                aria-label="Share match link"
            >
                {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </button>
        </div>
    );
};
