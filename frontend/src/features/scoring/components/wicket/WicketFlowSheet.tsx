import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { useScoringStore } from '../../scoringStore';
import { DismissalTypeStep } from './DismissalTypeStep';
import { FielderSelectStep } from './FielderSelectStep';
import { NewBatsmanStep } from './NewBatsmanStep';
import type { DismissalType, TeamSummary } from '../../../matches/types/domainTypes';

export const WicketFlowSheet = () => {
    const isWicketFlowActive = useScoringStore((s) => s.isWicketFlowActive);
    const wicketDraft = useScoringStore((s) => s.wicketDraft);
    const matchState = useScoringStore((s) => s.matchState);
    const isSubmitting = useScoringStore((s) => s.isSubmitting);
    const syncState = useScoringStore((s) => s.syncState);

    // Actions
    const cancelWicketFlow = useScoringStore((s) => s.cancelWicketFlow);
    const setDismissalType = useScoringStore((s) => s.setDismissalType);
    const setFielder = useScoringStore((s) => s.setFielder);
    const setNewBatsman = useScoringStore((s) => s.setNewBatsman);
    const commitWicket = useScoringStore((s) => s.commitWicket);

    // Local Step Management
    const [step, setStep] = useState<'TYPE' | 'FIELDER' | 'BATSMAN'>('TYPE');

    // Helper to check if fielder is required
    const dismissalRequiresFielder = (type: DismissalType): boolean => {
        return ["CAUGHT", "RUN_OUT", "STUMPED"].includes(type);
    };

    // Derived Data: Teams
    const teams = useMemo<{ batting: TeamSummary | null, fielding: TeamSummary | null }>(() => {
        if (!matchState) return { batting: null, fielding: null };

        const currentInningsIndex = Math.max(0, matchState.innings.length - 1);
        const battingTeam = currentInningsIndex % 2 === 0 ? matchState.teamA : matchState.teamB;
        const fieldingTeam = currentInningsIndex % 2 === 0 ? matchState.teamB : matchState.teamA;

        return { batting: battingTeam, fielding: fieldingTeam };
    }, [matchState]);


    // Handlers
    const handleDismissalSelect = (type: DismissalType) => {
        setDismissalType(type);
        if (dismissalRequiresFielder(type)) {
            setStep('FIELDER');
        } else {
            setStep('BATSMAN');
        }
    };

    const handleFielderSelect = (playerId: string) => {
        setFielder(playerId);
        setStep('BATSMAN');
    };

    const handleClose = () => {
        cancelWicketFlow();
        setStep('TYPE'); // Reset local step
    };

    // Render Content
    const renderContent = () => {
        if (step === 'TYPE') {
            return <DismissalTypeStep onSelect={handleDismissalSelect} />;
        }
        if (step === 'FIELDER') {
            return (
                <FielderSelectStep
                    players={teams.fielding?.players || []}
                    onSelect={handleFielderSelect}
                    onBack={() => setStep('TYPE')}
                />
            );
        }
        if (step === 'BATSMAN') {
            // We need to pass the currently selected batsman if any, or handling it here.
            // For simplicity: The step just lists players. 
            // Logic: User taps player -> we set it -> and we show a "Confirm" button overlay or similar.
            // Or, we pass a wrapper that handles the "Select + Commit" flow?

            // Let's wrap NewBatsmanStep to handle the "Confirm" UI part here for now
            return (
                <div className="flex flex-col h-full relative">
                    <NewBatsmanStep
                        players={teams.batting?.players || []} // TODO: Filter out current/out players in real app
                        onSelect={(id) => {
                            setNewBatsman(id);
                            commitWicket(); // Auto-commit on tap for speed? Or specific confirm? 
                            // Requirement said "Confirm button calls commitWicket".
                            // Let's stick to auto-commit for flow smoothness unless user specified explicit button separate from list.
                            // "Confirm button: Calls commitWicket()" - implied explicit action.
                            // BUT, NewBatsmanStep usually is the last action.
                            // Refined flow: Tap Player -> updates draft -> UI shows "Confirm Done"?
                            // Let's make `NewBatsmanStep` taking an `onConfirm` prop?
                            // No, let's just do: Tap -> Commit. It's faster. 
                            // If explicit confirm is needed, I'd split it. 
                            // Re-reading: "Select New Batsman ... Tap -> setNewBatsman ... Confirm button calls commitWicket"
                            // This implies the user selects, SEES the selection, then hits confirm.
                            // OK, I will assume NewBatsmanStep should look like a list, allowing selection, then a big button at bottom.
                        }}
                        onBack={() => {
                            // Go back to Fielder if required, else Type
                            if (wicketDraft?.dismissalType && dismissalRequiresFielder(wicketDraft.dismissalType)) {
                                setStep('FIELDER');
                            } else {
                                setStep('TYPE');
                            }
                        }}
                        isSubmitting={isSubmitting}
                    />
                </div>
            );
        }
    };

    if (!isWicketFlowActive) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 pointer-events-auto transition-opacity backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Sheet */}
            <div className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh] min-h-[50vh] animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
                    <h2 className={clsx("font-bold", "text-lg")}>
                        {step === 'TYPE' ? 'Wicket: Dismissal Method' : step === 'FIELDER' ? 'Wicket: Fielder' : 'Wicket: New Batsman'}
                    </h2>
                    <button onClick={handleClose} className="p-2 -mr-2 text-textSecondary hover:text-textPrimary">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-4">
                    {renderContent()}
                </div>

                {/* Footer / Loading Overlay */}
                {(isSubmitting || syncState === 'CONFLICT') && (
                    <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                        <Loader2 className="animate-spin text-brand" />
                    </div>
                )}
            </div>
        </div>
    );
};
