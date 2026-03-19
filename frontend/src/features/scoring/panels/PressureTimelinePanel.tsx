import { useScoringStore } from "../scoringStore";
import { derivePressureIndex } from "../engine/analytics/derivePressureIndex";
import { Gauge } from 'lucide-react';

export const PressureTimelinePanel = () => {
    const matchState = useScoringStore(s => s.matchState);
    const derivedState = useScoringStore(s => s.derivedState);

    if (!matchState || !derivedState) return null;

    if (derivedState.currentInningsIndex < 1) {
        return (
            <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-orange-500" />
                        Pressure Meter
                    </h3>
                </div>
                <div className="flex-1 w-full flex items-center justify-center text-muted-foreground text-sm font-medium bg-card rounded-xl shadow-inner mt-2 p-4 text-center">
                    Pressure Index activates during the run chase (2nd Innings).
                </div>
            </div>
        );
    }

    const pressure = derivePressureIndex({
        ...derivedState,
        totalMatchOvers: (matchState as any).config?.overs || 20
    } as any);

    let textClass = "text-emerald-500";
    if (pressure?.pressureLevel === "MEDIUM") {
        textClass = "text-amber-500";
    } else if (pressure?.pressureLevel === "HIGH") {
        textClass = "text-orange-500";
    } else if (pressure?.pressureLevel === "EXTREME") {
        textClass = "text-rose-500";
    }

    // Needle rotation (-90 to 90 degrees)
    // LOW = -45, MEDIUM = 0, HIGH = 45, EXTREME = 90
    let rotation = -45;
    if (pressure?.pressureLevel === "MEDIUM") rotation = 0;
    if (pressure?.pressureLevel === "HIGH") rotation = 45;
    if (pressure?.pressureLevel === "EXTREME") rotation = 90;

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-orange-500" />
                    Pressure Index
                </h3>
            </div>
            
            <div className="flex-1 w-full flex flex-col items-center justify-center mt-2 bg-card rounded-xl shadow-inner p-4 text-center">
                {!pressure ? (
                    <div className="text-muted-foreground text-sm font-medium">Calculating...</div>
                ) : (
                    <>
                        <div className="relative w-48 h-24 overflow-hidden mb-6">
                            {/* Dial */}
                            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[1.5rem] border-muted" />
                            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[1.5rem] border-transparent border-t-emerald-500 border-l-emerald-500" style={{ transform: 'rotate(-45deg)', clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }} />
                            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[1.5rem] border-transparent border-t-amber-500 border-r-amber-500" style={{ transform: 'rotate(45deg)', clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }} />
                            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[1.5rem] border-transparent border-b-rose-500 border-r-rose-500" style={{ transform: 'rotate(45deg)', clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)' }} />
                            
                            {/* Needle */}
                            <div 
                                className="absolute bottom-0 left-1/2 w-1 h-20 origin-bottom rounded-full bg-foreground shadow-sm transition-transform duration-1000 ease-out"
                                style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                            />
                            <div className="absolute bottom-[-10px] left-1/2 w-5 h-5 rounded-full bg-foreground border-4 border-card -translate-x-1/2" />
                        </div>

                        <div className={`text-3xl font-black tracking-tight ${textClass} capitalize`}>
                            {pressure.pressureLevel}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground mt-1">
                            Pressure Gap: {pressure.pressureGap > 0 ? '+' : ''}{pressure.pressureGap.toFixed(2)}
                        </div>

                        <div className="flex w-full justify-between items-center mt-8 px-4 text-sm bg-background p-3 rounded-lg border border-border">
                            <div className="text-center">
                                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Current RR</div>
                                <div className="font-mono font-bold">{pressure.currentRate.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Required RR</div>
                                <div className="font-mono font-bold text-rose-500">{pressure.requiredRate.toFixed(2)}</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
