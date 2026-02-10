import { useState, useCallback } from 'react';
import type { ShotDirection, ShotDistance } from '@shared/scoring';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, SkipForward } from 'lucide-react';

interface ShotDirectionPickerProps {
    isOpen: boolean;
    onSelect: (direction: ShotDirection, distance: ShotDistance) => void;
    onSkip: () => void;
    batsmanName: string;
    runs: number;
}

// Zone angles (degrees clockwise from 12 o'clock / straight)
const ZONES: { direction: ShotDirection; label: string; angle: number; color: string }[] = [
    { direction: 'straight', label: 'Straight', angle: 0, color: '#3B82F6' },
    { direction: 'cover', label: 'Cover', angle: 45, color: '#10B981' },
    { direction: 'point', label: 'Point', angle: 90, color: '#8B5CF6' },
    { direction: 'third-man', label: 'Third Man', angle: 135, color: '#F59E0B' },
    { direction: 'fine-leg', label: 'Fine Leg', angle: 180, color: '#EF4444' },
    { direction: 'square-leg', label: 'Square Leg', angle: 225, color: '#EC4899' },
    { direction: 'mid-wicket', label: 'Mid Wicket', angle: 270, color: '#06B6D4' },
    { direction: 'long-on', label: 'Long On', angle: 315, color: '#84CC16' },
];

// Distance rings
const DISTANCE_RINGS: { distance: ShotDistance; radius: number; label: string }[] = [
    { distance: 'short', radius: 35, label: 'Short' },
    { distance: 'medium', radius: 55, label: 'Medium' },
    { distance: 'boundary', radius: 75, label: 'Boundary' },
];

export function ShotDirectionPicker({ isOpen, onSelect, onSkip, batsmanName, runs }: ShotDirectionPickerProps) {
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const clickX = e.clientX - rect.left - centerX;
        const clickY = e.clientY - rect.top - centerY;

        // Calculate distance from center (as percentage of radius)
        const distFromCenter = Math.sqrt(clickX * clickX + clickY * clickY);
        const maxRadius = Math.min(rect.width, rect.height) / 2;
        const distPercent = (distFromCenter / maxRadius) * 100;

        // Skip if clicked too close to center
        if (distPercent < 15) return;

        // Determine distance
        let shotDist: ShotDistance;
        if (distPercent < 40) shotDist = 'short';
        else if (distPercent < 65) shotDist = 'medium';
        else shotDist = 'boundary';

        // Calculate angle (0 = top, clockwise)
        let angle = Math.atan2(clickX, -clickY) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        // Map angle to nearest zone
        const zoneIndex = Math.round(angle / 45) % 8;
        const zone = ZONES[zoneIndex];

        onSelect(zone.direction, shotDist);
    }, [onSelect]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onSkip(); }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle className="text-center">
                        Shot Direction
                    </DialogTitle>
                    <p className="text-center text-sm text-muted-foreground">
                        {batsmanName} scored <span className="font-bold text-primary">{runs}</span> run{runs !== 1 ? 's' : ''}
                    </p>
                </DialogHeader>
                <div className="px-4 pb-2">
                    {/* Cricket Field SVG */}
                    <div className="relative mx-auto" style={{ maxWidth: '320px' }}>
                        <svg
                            viewBox="0 0 200 200"
                            className="w-full h-auto cursor-crosshair"
                            onClick={handleClick}
                        >
                            {/* Field background */}
                            <circle cx="100" cy="100" r="90" fill="#1a472a" opacity="0.15" />

                            {/* Distance rings */}
                            {DISTANCE_RINGS.map((ring) => (
                                <circle
                                    key={ring.distance}
                                    cx="100"
                                    cy="100"
                                    r={ring.radius}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="0.5"
                                    opacity="0.2"
                                    strokeDasharray="3,3"
                                />
                            ))}

                            {/* Inner circle (pitch area) */}
                            <circle cx="100" cy="100" r="12" fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />

                            {/* Zone sectors */}
                            {ZONES.map((zone, i) => {
                                const startAngle = (zone.angle - 22.5) * (Math.PI / 180);
                                const endAngle = (zone.angle + 22.5) * (Math.PI / 180);
                                const r = 85;
                                const ir = 15;

                                const x1 = 100 + ir * Math.sin(startAngle);
                                const y1 = 100 - ir * Math.cos(startAngle);
                                const x2 = 100 + r * Math.sin(startAngle);
                                const y2 = 100 - r * Math.cos(startAngle);
                                const x3 = 100 + r * Math.sin(endAngle);
                                const y3 = 100 - r * Math.cos(endAngle);
                                const x4 = 100 + ir * Math.sin(endAngle);
                                const y4 = 100 - ir * Math.cos(endAngle);

                                const isHovered = hoveredZone === zone.direction;

                                return (
                                    <path
                                        key={zone.direction}
                                        d={`M ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${ir} ${ir} 0 0 0 ${x1} ${y1}`}
                                        fill={zone.color}
                                        opacity={isHovered ? 0.5 : 0.15}
                                        stroke={zone.color}
                                        strokeWidth={isHovered ? 1.5 : 0.5}
                                        onMouseEnter={() => setHoveredZone(zone.direction)}
                                        onMouseLeave={() => setHoveredZone(null)}
                                        className="transition-opacity cursor-pointer"
                                    />
                                );
                            })}

                            {/* Zone labels */}
                            {ZONES.map((zone) => {
                                const labelR = 78;
                                const angleRad = zone.angle * (Math.PI / 180);
                                const x = 100 + labelR * Math.sin(angleRad);
                                const y = 100 - labelR * Math.cos(angleRad);

                                return (
                                    <text
                                        key={`label-${zone.direction}`}
                                        x={x}
                                        y={y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize="5"
                                        fill="currentColor"
                                        opacity="0.7"
                                        className="pointer-events-none select-none"
                                    >
                                        {zone.label}
                                    </text>
                                );
                            })}

                            {/* Pitch rectangle */}
                            <rect x="97" y="88" width="6" height="24" fill="hsl(var(--muted-foreground))" opacity="0.3" rx="1" />

                            {/* Batsman dot */}
                            <circle cx="100" cy="105" r="2" fill="hsl(var(--primary))" />
                        </svg>

                        {/* Distance labels */}
                        <div className="flex justify-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>🟢 Short</span>
                            <span>🟡 Medium</span>
                            <span>🔴 Boundary</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 pt-2 border-t flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={onSkip}
                    >
                        <SkipForward className="h-4 w-4" />
                        Skip This Ball
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
