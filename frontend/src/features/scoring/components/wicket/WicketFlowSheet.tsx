import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { useScoringStore } from '../../scoringStore';
import { DismissalTypeStep } from './DismissalTypeStep';
import { FielderSelectStep } from './FielderSelectStep';
import { RunOutStep } from './RunOutStep';
import { NextBatsmanSheet } from '../NextBatsmanSheet';
import type { DismissalType, TeamSummary } from '../../../matches/types/domainTypes';

export const WicketFlowSheet = () => {
    const isWicketFlowActive = useScoringStore((s) => s.isWicketFlowActive);
    const wicketDraft = useScoringStore((s) => s.wicketDraft);
    const matchState = useScoringStore((s) => s.matchState);
    const isSubmitting = useScoringStore((s) => s.isSubmitting);
    const syncStatus = useScoringStore((s) => s.syncStatus);

    // Actions
    const cancelWicketFlow = useScoringStore((s) => s.cancelWicketFlow);
    const setDismissalType = useScoringStore((s) => s.setDismissalType);
    const setFielder = useScoringStore((s) => s.setFielder);
    const setRunOutData = useScoringStore((s) => s.setRunOutData);
    const setNewBatsman = useScoringStore((s) => s.setNewBatsman);
    const commitWicket = useScoringStore((s) => s.commitWicket);

    // Derived states
    const derivedState = useScoringStore((s) => s.derivedState);
    const currentInnings = derivedState?.innings[derivedState.currentInningsIndex];
    const isFreeHit = currentInnings?.isFreeHit || false;
    
    const currentBatsmen = useScoringStore((s) => s.getBatsmanStats()).filter(b => !b.isOut);
    const striker = currentBatsmen.find(b => b.playerId === currentInnings?.strikerId);
    const nonStriker = currentBatsmen.find(b => b.playerId === currentInnings?.nonStrikerId);

    // Local Step Management
    const [step, setStep] = useState<'TYPE' | 'FIELDER' | 'RUN_OUT' | 'BATSMAN'>('TYPE');

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
        
        // Auto Caught & Bowled logic?
        // Let's just do standard transitions here:
        if (wicketDraft?.dismissalType === 'RUN_OUT') {
            setStep('RUN_OUT');
        } else {
            setStep('BATSMAN');
        }
    };

    const handleRunOutSelect = (data: { playerOutId: string, completedRuns: number }) => {
        setRunOutData(data);
        setStep('BATSMAN');
    };

    const handleBatsmanSelect = (playerId: string) => {
        setNewBatsman(playerId);
        commitWicket();
    };

    const handleClose = () => {
        cancelWicketFlow();
        setStep('TYPE'); // Reset local step
    };

    // Render Content
    const renderContent = () => {
        if (step === 'TYPE') {
            return <DismissalTypeStep onSelect={handleDismissalSelect} isFreeHit={isFreeHit} />;
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
        if (step === 'RUN_OUT') {
            return (
                <RunOutStep
                    striker={striker ? { id: striker.playerId, name: striker.playerId } : { id: 's', name: 'Striker' }}
                    nonStriker={nonStriker ? { id: nonStriker.playerId, name: nonStriker.playerId } : { id: 'ns', name: 'Non-Striker' }}
                    onSelect={handleRunOutSelect}
                    onBack={() => setStep('FIELDER')}
                />
            );
        }
        if (step === 'BATSMAN') {
            // Check if 10 wickets are down
            const totalWickets = matchState?.innings[matchState.innings.length - 1]?.totalWickets || 0;
            if (totalWickets >= 9) { // 9 wickets down + this one = 10 (innings over)
                // Just commit immediately, no next batsman needed
                commitWicket();
                return <div className="p-8 text-center text-muted-foreground">Innings Over...</div>;
            }

            const alreadyBatted = useScoringStore.getState().getBatsmanStats().map(b => b.playerId);
            
            return (
                <NextBatsmanSheet
                    isOpen={true}
                    players={teams.batting?.players || []}
                    alreadyBatted={alreadyBatted}
                    onSelect={handleBatsmanSelect}
                    onClose={handleClose}
                />
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
            <div className="w-full max-w-md bg-card rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh] min-h-[50vh] animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
                    <h2 className={clsx("font-bold", "text-lg")}>
                        {step === 'TYPE' ? 'Wicket: Dismissal Method' 
                         : step === 'FIELDER' ? 'Wicket: Fielder' 
                         : step === 'RUN_OUT' ? 'Wicket: Run Out Details'
                         : 'Wicket: New Batsman'}
                    </h2>
                    <button onClick={handleClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-4">
                    {renderContent()}
                </div>

                {/* Footer / Loading Overlay */}
                {(isSubmitting || syncStatus === 'SYNCING') && (
                    <div className="absolute inset-0 bg-card/50 z-50 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                )}
            </div>
        </div>
    );
};
