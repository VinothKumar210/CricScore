import { useScoringStore } from "../scoringStore";
import { deriveWagonWheelData } from "../engine/analytics/deriveWagonWheelData";
import { Target } from 'lucide-react';

export const WagonWheelPanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);

    if (!derivedState) return null;

    // Filter events for current innings to get wagon wheel data
    const inningsEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    
    // Pass subset of events to deriveWagonWheelData if we wanted just one batsman. 
    // For the panel, let's show all team shots or selected batter.
    // For simplicity, overall team shots for the current innings:
    const data = deriveWagonWheelData(inningsEvents);

    // Plot points on a 100x100 SVG.
    // Center is (50, 50). Radius is 45.
    const renderShot = (shot: any, index: number) => {
        const { angle, distance, runs } = shot;
        // Convert polar to cartesian
        const rad = (angle - 90) * (Math.PI / 180); // -90 so 0 degrees is straight UP (towards bowler)
        
        // Scale distance (0-100) to our SVG radius (0-45)
        const r = (distance / 100) * 45;
        
        const x = 50 + r * Math.cos(rad);
        const y = 50 + r * Math.sin(rad);

        let strokeColor = "#3b82f6"; // 1-3 runs
        if (runs === 4) strokeColor = "#10b981"; // 4s
        else if (runs === 6) strokeColor = "#a855f7"; // 6s

        return (
            <line 
                key={index} 
                x1="50" y1="50" 
                x2={x} y2={y} 
                stroke={strokeColor} 
                strokeWidth={runs >= 4 ? "1.5" : "1"} 
                strokeLinecap="round"
                opacity={runs >= 4 ? 1 : 0.6}
            />
        );
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Wagon Wheel
                </h3>
                <div className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-md tracking-widest uppercase">
                    Inn {derivedState.currentInningsIndex + 1}
                </div>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner flex flex-col items-center justify-center p-4">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium z-10">
                        No shot data recorded
                    </div>
                ) : null}
                
                <svg viewBox="0 0 100 100" className="w-full h-full max-h-[300px] overflow-visible drop-shadow-xl">
                    {/* Outer boundary */}
                    <circle cx="50" cy="50" r="45" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                    
                    {/* Inner 30 yard circle (approx) */}
                    <circle cx="50" cy="50" r="22.5" fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
                    
                    {/* Pitch */}
                    <rect x="47" y="40" width="6" height="20" fill="#1e293b" stroke="#334155" strokeWidth="0.5" rx="1" />
                    
                    {/* Zones lines */}
                    <line x1="50" y1="5" x2="50" y2="95" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1 3" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1 3" />

                    {/* Shots */}
                    {data.map((shot, i) => renderShot(shot, i))}
                    
                    <circle cx="50" cy="50" r="1.5" fill="#f8fafc" />
                </svg>

                <div className="absolute bottom-2 flex gap-4 text-[10px] font-medium text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full backdrop-blur-md">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>1-3s</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>4s</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div>6s</span>
                </div>
            </div>
        </div>
    );
};
