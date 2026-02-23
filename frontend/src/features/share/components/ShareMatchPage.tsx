import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useShareStore } from '../shareStore';
import { ShareScoreCard } from './ShareScoreCard';
import { ShareReplayViewer } from './ShareReplayViewer';
import { Loader2, ShieldX, SearchX, Clock } from 'lucide-react';

/**
 * ShareMatchPage — Public route component at /share/:matchId
 *
 * State Machine:
 *   Mount → fetchMatch
 *   404 → "Not Found"
 *   403 → "Private Match"
 *   200 + LIVE → Score summary only
 *   200 + COMPLETED → Score + Replay
 *
 * SECURITY:
 * - No scoring controls
 * - No WebSocket
 * - No auth required
 * - No export button
 *
 * CLEANUP:
 * - shareStore.reset() called on unmount
 */
export const ShareMatchPage = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const matchData = useShareStore(s => s.matchData);
    const events = useShareStore(s => s.events);
    const matchConfig = useShareStore(s => s.matchConfig);
    const isLoading = useShareStore(s => s.isLoading);
    const isEventsLoading = useShareStore(s => s.isEventsLoading);
    const error = useShareStore(s => s.error);
    const httpStatus = useShareStore(s => s.httpStatus);
    const fetchMatch = useShareStore(s => s.fetchMatch);
    const fetchEvents = useShareStore(s => s.fetchEvents);
    const isRateLimited = useShareStore(s => s.isRateLimited);
    const reset = useShareStore(s => s.reset);
    const prevTitle = useRef(document.title);

    // Fetch match on mount
    useEffect(() => {
        if (matchId) {
            fetchMatch(matchId);
        }

        // ⚠️ CRITICAL: reset store + restore title on unmount
        return () => {
            reset();
            document.title = prevTitle.current;
        };
    }, [matchId, fetchMatch, reset]);

    // Set document.title when match data loads
    useEffect(() => {
        if (matchData) {
            document.title = `${matchData.homeTeamName} vs ${matchData.awayTeamName} — CricScore`;
        }
    }, [matchData]);

    // Auto-fetch events when match is COMPLETED or ABANDONED
    useEffect(() => {
        if (matchData && matchId && (matchData.status === 'COMPLETED' || matchData.status === 'ABANDONED')) {
            fetchEvents(matchId);
        }
    }, [matchData, matchId, fetchEvents]);

    // Loading
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                <p className="text-sm text-textSecondary">Loading match...</p>
            </div>
        );
    }

    // Error — rate limited
    if (isRateLimited) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 gap-3 text-center">
                <Clock className="w-12 h-12 text-amber-500" />
                <h2 className="text-lg font-semibold text-textPrimary">Too Many Requests</h2>
                <p className="text-sm text-textSecondary max-w-sm">
                    You're loading pages too quickly. Please wait a moment and try again.
                </p>
                <button
                    onClick={() => matchId && fetchMatch(matchId)}
                    className="mt-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium
                               hover:bg-brand/90 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Error — generic
    if (error && !matchData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 gap-3">
                <p className="text-danger font-semibold">{error}</p>
                <button
                    onClick={() => matchId && fetchMatch(matchId)}
                    className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium
                               hover:bg-brand/90 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    // 404 — Match not found
    if (httpStatus === 404) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 gap-3 text-center">
                <SearchX className="w-12 h-12 text-textSecondary" />
                <h2 className="text-lg font-semibold text-textPrimary">Match Not Found</h2>
                <p className="text-sm text-textSecondary max-w-sm">
                    This match doesn't exist or the link may have expired.
                </p>
            </div>
        );
    }

    // 403 — Private match
    if (httpStatus === 403) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 gap-3 text-center">
                <ShieldX className="w-12 h-12 text-amber-500" />
                <h2 className="text-lg font-semibold text-textPrimary">Private Match</h2>
                <p className="text-sm text-textSecondary max-w-sm">
                    This match is private and cannot be shared publicly.
                </p>
            </div>
        );
    }

    if (!matchData) return null;

    const isReplayable = matchData.status === 'COMPLETED' || matchData.status === 'ABANDONED';

    return (
        <div className="px-4 py-6 space-y-6">
            {/* Score Card (always shown) */}
            <ShareScoreCard match={matchData} />

            {/* Replay Section (COMPLETED/ABANDONED only) */}
            {isReplayable && (
                <>
                    {isEventsLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2">
                            <Loader2 className="w-5 h-5 text-brand animate-spin" />
                            <span className="text-sm text-textSecondary">Loading replay data...</span>
                        </div>
                    ) : events && matchConfig ? (
                        <ShareReplayViewer
                            match={matchData}
                            events={events}
                            matchConfig={matchConfig}
                        />
                    ) : null}
                </>
            )}

            {/* LIVE status note */}
            {matchData.status === 'LIVE' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-sm font-medium text-amber-800">
                        🔴 This match is live
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                        Full replay will be available after the match ends.
                    </p>
                </div>
            )}

            {/* Footer */}
            <div className="text-center py-4 border-t border-border">
                <p className="text-xs text-textSecondary">
                    Powered by <span className="font-semibold text-brand">CricScore</span>
                </p>
            </div>
        </div>
    );
};
