import { useState } from 'react';
import { CloudRain, CheckCircle2, Calculator } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { calculateRevisedTarget } from '../engine/dls';

export const RainBreakSheet = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const applyRainInterruption = useScoringStore(s => s.applyRainInterruption);
    const derivedState = useScoringStore(s => s.derivedState);
    const [revisedOvers, setRevisedOvers] = useState<string>('');

    if (!isOpen || !derivedState) return null;

    // We only recalculate if they are in the 2nd innings and there is a target
    const currentInningsIndex = derivedState.currentInningsIndex;
    let targetMsg = "";
    
    if (currentInningsIndex === 1 && revisedOvers && Number(revisedOvers) > 0) {
        const firstInningsTotal = derivedState.innings[0].totalRuns;
        const target = calculateRevisedTarget(
            firstInningsTotal,
            derivedState.totalMatchOvers || 20,
            derivedState.totalMatchOvers || 20,
            Number(revisedOvers)
        );
        targetMsg = `Revised DLS Target: ${target}`;
    }

    const handleApply = async () => {
        const overs = Number(revisedOvers);
        if (overs > 0 && overs <= (derivedState.totalMatchOvers || 20)) {
            await applyRainInterruption(overs);
            onClose();
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full h-[60%] bg-card rounded-t-3xl border-t shadow-2xl flex flex-col animate-in slide-in-from-bottom-[100%] duration-300">
                <div className="w-full flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-muted rounded-full" />
                </div>
                
                <div className="px-6 py-4 border-b flex justify-between items-center bg-secondary/30">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <CloudRain className="w-6 h-6 text-indigo-500" />
                        Rain Interruption
                    </h3>
                    <button onClick={onClose} className="px-4 py-1.5 rounded-full bg-secondary text-sm font-semibold hover:bg-secondary/80 transition-colors">
                        Cancel
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                        <Calculator className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-foreground">
                            Enter the revised number of overs for this match. The DLS engine will automatically calculate the revised target if the 2nd innings has started.
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Revised Match Overs
                        </label>
                        <input 
                            type="number"
                            value={revisedOvers}
                            onChange={(e) => setRevisedOvers(e.target.value)}
                            className="w-full bg-secondary border border-border p-4 rounded-xl text-lg font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={`Max: ${derivedState.totalMatchOvers || 20}`}
                            min="1"
                            max={derivedState.totalMatchOvers || 20}
                        />
                    </div>

                    {targetMsg && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center animate-in zoom-in-95 duration-200">
                            <h4 className="text-2xl font-black text-indigo-500 tracking-tight">
                                {targetMsg}
                            </h4>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-background border-t">
                    <button 
                        onClick={handleApply}
                        disabled={!revisedOvers || Number(revisedOvers) <= 0 || Number(revisedOvers) > (derivedState.totalMatchOvers || 20)}
                        className="w-full py-4 rounded-xl bg-indigo-500 text-white font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        Apply Revised Target
                    </button>
                </div>
            </div>
        </div>
    );
};
