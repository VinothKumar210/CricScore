import { useState, useRef, useEffect } from 'react';
import { Target, X, SkipForward } from 'lucide-react';

interface WagonWheelInputProps {
    onSave: (angle: number, distance: number) => void;
    onSkip: () => void;
    batsmanName?: string;
}

export const WagonWheelInput = ({ onSave, onSkip, batsmanName = "Batsman" }: WagonWheelInputProps) => {
    const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
    const [currentPoint, setCurrentPoint] = useState<{ x: number, y: number } | null>(null);
    const groundRef = useRef<HTMLDivElement>(null);

    // Set center on mount so we have an origin for drawing the vector
    useEffect(() => {
        if (groundRef.current) {
            const rect = groundRef.current.getBoundingClientRect();
            // Pitch is at the center
            setStartPoint({
                x: rect.width / 2,
                y: rect.height / 2
            });
        }
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!groundRef.current) return;
        const rect = groundRef.current.getBoundingClientRect();
        setCurrentPoint({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!currentPoint || !groundRef.current) return;
        // Allows dragging to refine the spot
        const rect = groundRef.current.getBoundingClientRect();
        setCurrentPoint({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handlePointerUp = () => {
        if (!startPoint || !currentPoint || !groundRef.current) return;

        const rect = groundRef.current.getBoundingClientRect();
        const radius = rect.width / 2; // Assume square ground

        // Calculate delta from center
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;

        // Angle in radians
        let angleRad = Math.atan2(dy, dx);
        
        // Convert to degrees standard orientation: Top = 0, Right = 90, Bottom = 180, Left = 270
        // Currently standard Math.atan2 has Right = 0, Bottom = 90, Left = 180/-180, Top = -90
        // Rotation needed: we want Top(0,-1) -> 0.
        let angleDeg = (angleRad * 180 / Math.PI) + 90;
        if (angleDeg < 0) angleDeg += 360;

        // Distance normalized 0 to 1
        const distancePx = Math.sqrt(dx * dx + dy * dy);
        let distance = distancePx / radius;
        distance = Math.max(0, Math.min(1, distance));

        onSave(Math.round(angleDeg), parseFloat(distance.toFixed(3)));
        setCurrentPoint(null);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onSkip} />
            
            {/* Modal */}
            <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
                 <div className="p-4 bg-muted/50 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Target className="w-5 h-5 text-indigo-500" />
                            Record Shot Direction
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Tap the ground to log where {batsmanName} hit the ball.
                        </p>
                    </div>
                    <button onClick={onSkip} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                 </div>

                 <div className="p-6 flex justify-center bg-[#1e293b]">
                     {/* Cricket Ground Vector SVG + Overlay */}
                     <div 
                        ref={groundRef}
                        className="relative w-full aspect-square rounded-full border-2 border-indigo-400/50 bg-[#0f172a] shadow-inner cursor-crosshair overflow-hidden touch-none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                     >
                        {/* 30 Yard Circle */}
                        <div className="absolute inset-[25%] rounded-full border border-indigo-400/30 border-dashed pointer-events-none" />
                        
                        {/* Pitch */}
                        <div className="absolute top-[40%] bottom-[40%] left-[45%] right-[45%] bg-[#b45309] rounded-sm pointer-events-none" />
                        
                        {/* Center Dot */}
                        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                        {/* Current Shot Line Preview */}
                        {startPoint && currentPoint && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                <line 
                                    x1={startPoint.x} 
                                    y1={startPoint.y} 
                                    x2={currentPoint.x} 
                                    y2={currentPoint.y} 
                                    stroke="#f43f5e" 
                                    strokeWidth="3"
                                    strokeDasharray="4 2"
                                />
                                <circle 
                                    cx={currentPoint.x} 
                                    cy={currentPoint.y} 
                                    r="6" 
                                    fill="#f43f5e" 
                                    stroke="#fff" 
                                    strokeWidth="2" 
                                />
                            </svg>
                        )}
                     </div>
                 </div>

                 <div className="p-4 bg-card border-t flex gap-3">
                     <button 
                         onClick={onSkip}
                         className="flex-1 py-3 px-4 rounded-xl bg-secondary text-foreground font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
                     >
                         <SkipForward className="w-5 h-5" />
                         Skip Shot
                     </button>
                 </div>
            </div>
        </div>
    );
};
