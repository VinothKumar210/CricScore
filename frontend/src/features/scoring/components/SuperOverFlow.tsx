import { useState } from 'react';
import { Trophy, CheckCircle2, X } from 'lucide-react';
import { useScoringStore } from '../scoringStore';

export const SuperOverFlow = () => {
    const derivedState = useScoringStore(s => s.derivedState);
    const startSuperOver = useScoringStore(s => s.startSuperOver);
    
    // Check if match is tied and we are not yet in Super Over
    const isTied = derivedState?.matchResult?.resultType === 'TIE';
    const isRegularPhase = derivedState?.matchPhase === 'REGULAR';
    
    const [isVisible, setIsVisible] = useState(isTied && isRegularPhase);

    if (!isTied || !isRegularPhase || !isVisible) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-background/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-card border shadow-2xl rounded-2xl overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95 duration-400">
                <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8 text-indigo-500" />
                </div>
                
                <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">
                    Match Tied!
                </h2>
                
                <p className="text-muted-foreground text-sm mb-6">
                    The regular innings have concluded in a dramatic tie. Would you like to play a Super Over to decide the winner?
                </p>

                <div className="w-full flex gap-3">
                    <button 
                        onClick={() => setIsVisible(false)} // Just hide it if they want to keep it as a tie
                        className="flex-1 py-3 px-4 rounded-xl border border-border bg-card text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Maybe Later
                    </button>
                    
                    <button 
                        onClick={async () => {
                            await startSuperOver();
                            setIsVisible(false);
                        }}
                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-indigo-500 text-white flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                    >
                        Start Super Over
                        <CheckCircle2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
