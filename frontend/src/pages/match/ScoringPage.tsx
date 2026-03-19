import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useScoringStore } from '../../features/scoring/scoringStore';
import { useScoringSocket } from '../../features/scoring/useScoringSocket';
import { ScoreHeader } from '../../features/scoring/components/ScoreHeader';
import { BatsmanCard } from '../../features/scoring/components/BatsmanCard';
import { BowlerCard } from '../../features/scoring/components/BowlerCard';
import { CurrentOverDots } from '../../features/scoring/components/CurrentOverDots';
import { ScoringPad } from '../../features/scoring/components/ScoringPad';
import { CommentaryPanel } from '../../features/scoring/components/CommentaryPanel';
import { MilestoneWatcher } from '../../features/scoring/components/MilestoneWatcher';
import { EventNotifier } from '../../features/scoring/broadcast/EventNotifier';
import { NextBowlerSheet } from '../../features/scoring/components/NextBowlerSheet';
import { OverSummaryToast } from '../../features/scoring/components/OverSummaryToast';
import { InningsBreakCard } from '../../features/scoring/components/InningsBreakCard';
import { Loader2 } from 'lucide-react';
import { SwipeableStatsContainer } from '../../features/scoring/panels/SwipeableStatsContainer';
import { ScorecardPanel } from '../../features/scoring/panels/ScorecardPanel';
import { WormChartPanel } from '../../features/scoring/panels/WormChartPanel';
import { ManhattanPanel } from '../../features/scoring/panels/ManhattanPanel';
import { OverComparisonPanel } from '../../features/scoring/panels/OverComparisonPanel';
import { WagonWheelPanel } from '../../features/scoring/panels/WagonWheelPanel';
import { PhaseRadarPanel } from '../../features/scoring/panels/PhaseRadarPanel';
import { WinProbPanel } from '../../features/scoring/panels/WinProbPanel';
import { RequiredRatePanel } from '../../features/scoring/panels/RequiredRatePanel';
import { MomentumPanel } from '../../features/scoring/panels/MomentumPanel';
import { PressureTimelinePanel } from '../../features/scoring/panels/PressureTimelinePanel';
import { MatchupGridPanel } from '../../features/scoring/panels/MatchupGridPanel';
import { ExtrasAnalysisPanel } from '../../features/scoring/panels/ExtrasAnalysisPanel';
import { BoundaryPercentPanel } from '../../features/scoring/panels/BoundaryPercentPanel';
import { EconomyProgressionPanel } from '../../features/scoring/panels/EconomyProgressionPanel';
import { BatsmanPhasePanel } from '../../features/scoring/panels/BatsmanPhasePanel';
import { ConfidencePanel } from '../../features/scoring/panels/ConfidencePanel';

export const ScoringPage = () => {
    const { id: matchId } = useParams<{ id: string }>();
    const initialize = useScoringStore((s) => s.initialize);
    const matchState = useScoringStore((s) => s.matchState);
    const derivedState = useScoringStore((s) => s.derivedState);
    const error = useScoringStore((s) => s.error);

    // Transition States
    const showNextBowlerSheet = useScoringStore((s) => s.showNextBowlerSheet);
    const showOverSummaryToast = useScoringStore((s) => s.showOverSummaryToast);
    const showInningsBreakCard = useScoringStore((s) => s.showInningsBreakCard);
    
    const setNextBowler = useScoringStore((s) => s.setNextBowler);
    const setShowNextBowlerSheet = useScoringStore((s) => s.setShowNextBowlerSheet);
    const setShowOverSummaryToast = useScoringStore((s) => s.setShowOverSummaryToast);
    const setShowInningsBreakCard = useScoringStore((s) => s.setShowInningsBreakCard);

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
        <div className="flex flex-col h-[100dvh] bg-background max-w-md mx-auto shadow-2xl overflow-hidden relative">
            {/* Broadcast Layer */}
            <EventNotifier />
            <MilestoneWatcher />

            {/* Header: Score + Team + Rates */}
            <div className="flex-none">
                <ScoreHeader />
            </div>

            {/* Current Over Dots */}
            <div className="flex-none">
                <CurrentOverDots />
            </div>

            {/* Batting & Bowling Cards */}
            <div className="flex-none px-3 py-2 space-y-2">
                <BatsmanCard />
                <BowlerCard />
            </div>

            {/* Commentary (scrollable) */}
            <div className="flex-1 overflow-y-auto px-3 pb-2">
                <CommentaryPanel />
            </div>

            {/* Footer: Scoring Pad */}
            <div className="flex-none pb-2">
                <ScoringPad />
            </div>

            {/* Advanced Stats Container (Below Scoring Pad) */}
            <div className="flex-none pb-safe-area mt-4">
                <SwipeableStatsContainer 
                    panels={[
                        <ScorecardPanel key="1" />,
                        <WormChartPanel key="2" />,
                        <ManhattanPanel key="3" />,
                        <OverComparisonPanel key="4" />,
                        <WagonWheelPanel key="5" />,
                        <PhaseRadarPanel key="6" />,
                        <WinProbPanel key="7" />,
                        <RequiredRatePanel key="8" />,
                        <MomentumPanel key="9" />,
                        <PressureTimelinePanel key="10" />,
                        <MatchupGridPanel key="11" />,
                        <ExtrasAnalysisPanel key="12" />,
                        <BoundaryPercentPanel key="13" />,
                        <EconomyProgressionPanel key="14" />,
                        <BatsmanPhasePanel key="15" />,
                        <ConfidencePanel key="16" />
                    ]}
                />
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

            {/* Over Transition Modals */}
            {matchState && derivedState && (
                <>
                    {showInningsBreakCard ? (() => {
                        const previousInningsIndex = Math.max(0, derivedState.currentInningsIndex - 1);
                        const previousInningsEngine = derivedState.innings[previousInningsIndex];
                        const battingTeamId = previousInningsEngine.battingTeamId;
                        const bowlingTeamId = previousInningsEngine.bowlingTeamId;
                        const getTeam = (id: string | undefined) => {
                            if (!id) return matchState.teamA;
                            return id === matchState.teamA.id ? matchState.teamA : matchState.teamB;
                        };

                        const battingTeam = getTeam(battingTeamId);
                        const bowlingTeam = getTeam(bowlingTeamId);

                        // Hacky way to get top performers: we just use current stats if it's the 1st innings break
                        const currentBatStats = useScoringStore.getState().getBatsmanStats().sort((a,b) => b.runs - a.runs).slice(0, 2);
                        const currentBowlStats = useScoringStore.getState().getBowlingStats().sort((a,b) => b.wickets - a.wickets).slice(0, 2);

                        const formatOvers = (balls: number) => {
                            const o = Math.floor(balls / 6);
                            const b = balls % 6;
                            return b === 0 ? `${o}` : `${o}.${b}`;
                        };

                        return (
                            <InningsBreakCard
                                inningsNumber={previousInningsIndex + 1}
                                battingTeam={battingTeam}
                                bowlingTeam={bowlingTeam}
                                score={{
                                    runs: previousInningsEngine.totalRuns,
                                    wickets: previousInningsEngine.totalWickets,
                                    overs: formatOvers(previousInningsEngine.totalBalls)
                                }}
                                target={derivedState.interruption?.revisedTarget ?? (previousInningsEngine.totalRuns + 1)}
                                topBatsmen={currentBatStats.map(b => ({
                                    name: battingTeam.players?.find(p => p.id === b.playerId)?.name || 'Unknown',
                                    runs: b.runs,
                                    balls: b.balls
                                }))}
                                topBowlers={currentBowlStats.map(b => ({
                                    name: bowlingTeam.players?.find(p => p.id === b.bowlerId)?.name || 'Unknown',
                                    wickets: b.wickets,
                                    runs: b.runsConceded,
                                    overs: b.overs
                                }))}
                                onStartNextInnings={() => {
                                    setShowInningsBreakCard(false);
                                    // Normally would push user to SelectOpeners screen here!
                                    // For now, we just close it and let the user select via ScoringPad
                                }}
                            />
                        );
                    })() : null}

                    {showNextBowlerSheet && (
                        <NextBowlerSheet
                            isOpen={showNextBowlerSheet}
                            team={
                                derivedState.innings[derivedState.currentInningsIndex]?.bowlingTeamId === matchState.teamA.id 
                                ? matchState.teamA 
                                : matchState.teamB
                            }
                            bowlerStats={useScoringStore.getState().getBowlingStats() as any}
                            previousBowlerId={derivedState.innings[derivedState.currentInningsIndex]?.currentBowlerId || null}
                            onSelect={(playerId) => setNextBowler(playerId)}
                            onClose={() => setShowNextBowlerSheet(false)}
                        />
                    )}

                    {showOverSummaryToast && (() => {
                        // Quick way to get last 6 legal balls + extras of previous over
                        // Since we just changed overs, the old over number is Math.floor(totalballs/6) - 1
                        const engineInnings = derivedState.innings[derivedState.currentInningsIndex];
                        const overNumber = Math.max(1, Math.floor(engineInnings.totalBalls / 6));
                        
                        // We filter events of this innings that match `overNumber - 1`
                        const events = useScoringStore.getState().events;
                        const thisInningsEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION'); // crude filter
                        
                        // We just grab the last N events roughly.
                        // For a precise implementation, standard is grouping by over.
                        const lastOversEvents = thisInningsEvents.slice(-10); // Approximation
                        const prevBowlerId = engineInnings.currentBowlerId;
                        const bowlingTeamId = engineInnings.bowlingTeamId;
                        const bowlingTeam = bowlingTeamId === matchState.teamA.id ? matchState.teamA : matchState.teamB;
                        const prevBowlerName = bowlingTeam?.players?.find((p: any) => p.id === prevBowlerId)?.name || 'Bowler';
                        
                        // Current stats should still reflect their figures well enough!
                        const bowlStats = useScoringStore.getState().getBowlingStats().find(b => b.bowlerId === prevBowlerId);
                        
                        const figures = bowlStats ? `${bowlStats.wickets}-${bowlStats.runsConceded} (${bowlStats.overs})` : '';

                        return (
                            <OverSummaryToast
                                overNumber={overNumber}
                                balls={lastOversEvents as any[]}
                                bowlerName={prevBowlerName}
                                bowlerFigures={figures}
                                onDismiss={() => setShowOverSummaryToast(false)}
                            />
                        );
                    })()}
                </>
            )}
        </div>
    );
};
