import { useState } from 'react';
import { clsx } from 'clsx';
import { Settings, ShieldAlert, CloudRain, Ban, ArrowLeftRight, MinusCircle, UserMinus } from 'lucide-react';
import { useScoringStore } from '../scoringStore';

interface MatchSettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MatchSettingsMenu = ({ isOpen, onClose }: MatchSettingsMenuProps) => {
    const isWagonWheelEnabled = useScoringStore(s => s.isWagonWheelEnabled);
    const toggleWagonWheel = useScoringStore(s => s.toggleWagonWheel);
    const deductShortRun = useScoringStore(s => s.deductShortRun);
    const addPenalty = useScoringStore(s => s.addPenalty);
    const abandonMatch = useScoringStore(s => s.abandonMatch);
    const setShowNextBowlerSheet = useScoringStore(s => s.setShowNextBowlerSheet);
    const matchState = useScoringStore(s => s.matchState);

    const [view, setView] = useState<'MENU' | 'PENALTY' | 'RAIN'>('MENU');

    if (!isOpen) {
        if (view !== 'MENU') setTimeout(() => setView('MENU'), 300); // reset on close
        return null;
    }

    const teamA = matchState?.teamA;
    const teamB = matchState?.teamB;

    const handleShortRun = () => {
        deductShortRun();
        onClose();
    };

    const handlePenalty = (teamId: string) => {
        addPenalty(teamId, 5);
        onClose();
    };

    const handleChangeBowler = () => {
        setShowNextBowlerSheet(true);
        onClose();
    };

    const handleRainBreak = () => {
        // Placeholder for DLS logic in R2
        alert("Rain Break / DLS feature will be enabled in Release 2.");
        onClose();
    };

    const handleAbandonMatch = () => {
        if (window.confirm("Are you sure you want to abandon the match? This cannot be undone.")) {
            abandonMatch();
            onClose();
        }
    };

    const handleSubstitute = () => {
        alert("Substitute Player feature will be enabled in future updates.");
        onClose();
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 border-t border-border flex flex-col max-h-[85vh]">
                <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 shrink-0" />

                {/* Header */}
                <div className="px-5 py-3 border-b border-border flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-foreground">
                            {view === 'MENU' ? 'Match Settings & Actions' : view === 'PENALTY' ? 'Award Penalty Runs' : 'Rain Break (DLS)'}
                        </h3>
                    </div>
                    {view !== 'MENU' && (
                        <button onClick={() => setView('MENU')} className="text-sm font-semibold text-primary">Back</button>
                    )}
                </div>

                {/* Content */}
                <div className="overflow-y-auto px-4 py-3">
                    {view === 'MENU' && (
                        <div className="flex flex-col gap-2">
                            <ActionRow icon={<ArrowLeftRight size={18} />} title="Change Bowler" desc="Change bowler mid-over (e.g. injury)" onClick={handleChangeBowler} />
                            <ActionRow icon={<MinusCircle size={18} />} title="Short Run" desc="Deduct 1 run for the current batters" onClick={handleShortRun} />
                            <ActionRow icon={<ShieldAlert size={18} />} title="Penalty Runs" desc="Award 5 penalty runs to a specific team" onClick={() => setView('PENALTY')} />
                            <ActionRow icon={<UserMinus size={18} />} title="Substitute Player" desc="Swap out an injured player for a sub" onClick={handleSubstitute} />
                            <ActionRow icon={<CloudRain size={18} />} title="Rain Break / DLS" desc="Revise overs and targets due to rain" onClick={handleRainBreak} />
                            
                            <div className="h-px bg-border/50 my-1" />
                            
                            {/* Toggle Wagon Wheel */}
                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Settings size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm text-foreground">Wagon Wheel Input</span>
                                        <span className="text-xs text-muted-foreground">Tap pitch map to select run zones</span>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isWagonWheelEnabled} onChange={toggleWagonWheel} />
                                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <ActionRow icon={<Ban size={18} />} title="Abandon Match" desc="End the match instantly with No Result" onClick={handleAbandonMatch} variant="destructive" />
                        </div>
                    )}

                    {view === 'PENALTY' && teamA && teamB && (
                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-muted-foreground mb-2">Which team should receive the 5 penalty runs?</p>
                            <button onClick={() => handlePenalty(teamA.id)} className="w-full h-14 bg-card border border-border rounded-xl font-bold flex items-center justify-center hover:bg-secondary transition-colors">
                                {teamA.name}
                            </button>
                            <button onClick={() => handlePenalty(teamB.id)} className="w-full h-14 bg-card border border-border rounded-xl font-bold flex items-center justify-center hover:bg-secondary transition-colors">
                                {teamB.name}
                            </button>
                        </div>
                    )}
                </div>

                <div className="px-5 pb-5 pt-2 shrink-0 border-t border-border mt-2">
                    <button onClick={onClose} className="w-full h-12 rounded-xl bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-all">
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
};

const ActionRow = ({ icon, title, desc, onClick, variant = 'default' }: { icon: React.ReactNode, title: string, desc: string, onClick: () => void, variant?: 'default'|'destructive' }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center p-3 rounded-xl border border-transparent transition-all active:scale-[0.98] text-left hover:bg-secondary hover:border-border"
    >
        <div className={clsx(
            "w-9 h-9 flex items-center justify-center rounded-lg mr-3 shrink-0",
            variant === 'destructive' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
            {icon}
        </div>
        <div className="flex flex-col">
            <span className={clsx("font-semibold text-sm", variant === 'destructive' ? "text-destructive" : "text-foreground")}>
                {title}
            </span>
            <span className="text-xs text-muted-foreground">
                {desc}
            </span>
        </div>
    </button>
);
