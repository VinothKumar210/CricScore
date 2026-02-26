// =============================================================================
// WagonWheel — Production-grade SVG wagon wheel visualization
// =============================================================================
//
// Pure SVG (no react-konva dependency).
// Renders a circular cricket ground with shot lines from center (batsman)
// to shot placement using angle + distance. Color-coded by runs.
//
// Props: matchId, batsmanId — fetches data from backend.
//
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { fetchWagonWheel, type WagonWheelData, type WagonWheelShot } from './wagonWheelService';
import './WagonWheel.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SVG_SIZE = 400;                    // Internal SVG viewBox
const CENTER = SVG_SIZE / 2;             // Center point (batsman position)
const GROUND_RADIUS = SVG_SIZE / 2 - 16; // Boundary circle radius
const PITCH_LENGTH = 28;                 // Pitch rectangle half-length
const PITCH_WIDTH = 5;                   // Pitch rectangle half-width

/** Shot run → color mapping */
function getShotColor(runs: number, isSix: boolean, isBoundary: boolean, isWicket: boolean): string {
    if (isWicket) return '#E53E3E';       // Red — wicket
    if (isSix) return '#E53E3E';          // Red — six
    if (isBoundary) return '#38A169';     // Green — four
    if (runs === 3) return '#D69E2E';     // Gold — three
    if (runs >= 1) return '#ECC94B';      // Yellow — 1–2
    return '#4A5568';                      // Gray — dot ball
}

/** Shot run → dot radius */
function getDotRadius(runs: number, isSix: boolean, isBoundary: boolean): number {
    if (isSix) return 6;
    if (isBoundary) return 5;
    if (runs >= 1) return 4;
    return 3;
}

// Zone label positions (angle midpoints for each zone, degrees clockwise from top)
const ZONE_LABELS: Record<string, { angle: number; label: string }> = {
    FINE_LEG: { angle: 20, label: 'Fine Leg' },
    SQUARE_LEG: { angle: 60, label: 'Sq Leg' },
    MID_WICKET: { angle: 110, label: 'Mid Wkt' },
    LONG_ON: { angle: 150, label: 'Long On' },
    STRAIGHT: { angle: 180, label: 'Straight' },
    LONG_OFF: { angle: 210, label: 'Long Off' },
    COVER: { angle: 260, label: 'Cover' },
    POINT: { angle: 310, label: 'Point' },
    THIRD_MAN: { angle: 345, label: '3rd Man' },
};

// Convert angle (degrees) + distance (0–1) to SVG x,y
function polarToXY(angleDeg: number, distance: number): { x: number; y: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180; // -90 because SVG 0° is right, cricket 0° is top
    const r = distance * GROUND_RADIUS;
    return {
        x: CENTER + r * Math.cos(rad),
        y: CENTER + r * Math.sin(rad),
    };
}

// ---------------------------------------------------------------------------
// Sub-components (memoized)
// ---------------------------------------------------------------------------

/** Ground rings + zone lines */
const GroundSVG = memo(function GroundSVG() {
    const rings = [0.25, 0.5, 0.75, 1.0];
    const zoneAngles = [0, 40, 80, 130, 160, 200, 240, 290, 330];

    return (
        <g>
            {/* Boundary circle */}
            <circle cx={CENTER} cy={CENTER} r={GROUND_RADIUS} fill="none"
                stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

            {/* Inner rings */}
            {rings.slice(0, -1).map(r => (
                <circle key={r} cx={CENTER} cy={CENTER} r={GROUND_RADIUS * r}
                    fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
                    strokeDasharray="3 3" />
            ))}

            {/* 30-yard circle */}
            <circle cx={CENTER} cy={CENTER} r={GROUND_RADIUS * 0.45}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"
                strokeDasharray="4 4" />

            {/* Zone divider lines */}
            {zoneAngles.map(angle => {
                const pt = polarToXY(angle, 1);
                return (
                    <line key={angle} x1={CENTER} y1={CENTER} x2={pt.x} y2={pt.y}
                        stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                );
            })}

            {/* Pitch rectangle */}
            <rect
                x={CENTER - PITCH_WIDTH} y={CENTER - PITCH_LENGTH}
                width={PITCH_WIDTH * 2} height={PITCH_LENGTH * 2}
                rx={2} fill="rgba(210,180,100,0.12)"
                stroke="rgba(210,180,100,0.2)" strokeWidth="0.5"
            />

            {/* Batsman dot (center) */}
            <circle cx={CENTER} cy={CENTER} r={3}
                fill="#D7A65B" opacity="0.8" />

            {/* Zone labels */}
            {Object.entries(ZONE_LABELS).map(([, info]) => {
                const { x, y } = polarToXY(info.angle, 0.88);
                return (
                    <text key={info.label} x={x} y={y}
                        textAnchor="middle" dominantBaseline="central"
                        fill="rgba(255,255,255,0.18)" fontSize="8"
                        fontFamily="Inter, system-ui, sans-serif" fontWeight="600">
                        {info.label}
                    </text>
                );
            })}
        </g>
    );
});

/** Single shot line + dot */
const ShotLine = memo(function ShotLine({
    shot,
    onHover,
    onLeave,
}: {
    shot: WagonWheelShot;
    onHover: (shot: WagonWheelShot, x: number, y: number) => void;
    onLeave: () => void;
}) {
    if (shot.shotAngle == null || shot.shotDistance == null) return null;

    const { x, y } = polarToXY(shot.shotAngle, shot.shotDistance);
    const color = getShotColor(shot.runs, shot.isSix, shot.isBoundary, shot.isWicket);
    const radius = getDotRadius(shot.runs, shot.isSix, shot.isBoundary);

    return (
        <g
            onMouseEnter={() => onHover(shot, x, y)}
            onMouseLeave={onLeave}
            style={{ cursor: 'pointer' }}
        >
            {/* Shot line from batsman to placement */}
            <line
                x1={CENTER} y1={CENTER} x2={x} y2={y}
                stroke={color} strokeWidth={1.2} opacity={0.6}
                strokeLinecap="round"
            />
            {/* Shot dot */}
            <circle cx={x} cy={y} r={radius}
                fill={color} opacity={0.9}
                stroke="rgba(255,255,255,0.3)" strokeWidth={0.5}
            />
            {/* Invisible hitbox for hover */}
            <circle cx={x} cy={y} r={10}
                fill="transparent" />
        </g>
    );
});

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function WagonWheelSkeleton() {
    return (
        <div className="ww-skeleton">
            <div className="ww-skeleton-circle" />
            <div className="ww-skeleton-stats">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="ww-skeleton-stat" />
                ))}
            </div>
            <div className="ww-skeleton-bar" style={{ width: '60%', margin: '12px auto 0' }} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface WagonWheelProps {
    matchId: string;
    batsmanId: string;
}

function WagonWheelInner({ matchId, batsmanId }: WagonWheelProps) {
    const [data, setData] = useState<WagonWheelData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{
        shot: WagonWheelShot; x: number; y: number;
    } | null>(null);

    // Fetch data
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchWagonWheel(matchId, batsmanId)
            .then(result => {
                if (!cancelled) {
                    setData(result);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    setError(err?.message || 'Failed to load wagon wheel');
                    setLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, [matchId, batsmanId]);

    // Tooltip handlers
    const handleHover = useCallback((shot: WagonWheelShot, x: number, y: number) => {
        setTooltip({ shot, x, y });
    }, []);

    const handleLeave = useCallback(() => {
        setTooltip(null);
    }, []);

    // Filter shots that have angle + distance data
    const plottableShots = useMemo(() => {
        if (!data) return [];
        return data.shots.filter(s => s.shotAngle != null && s.shotDistance != null);
    }, [data]);

    // ── Loading ──
    if (loading) return <WagonWheelSkeleton />;

    // ── Error ──
    if (error) {
        return (
            <div className="ww-empty">
                <div className="ww-empty-icon">⚠️</div>
                <div>{error}</div>
            </div>
        );
    }

    // ── No data ──
    if (!data || data.totalShots === 0) {
        return (
            <div className="ww-empty">
                <div className="ww-empty-icon">🏏</div>
                <div>No wagon wheel data available</div>
            </div>
        );
    }

    // Convert tooltip SVG coords to percentage for overlay positioning
    const tooltipStyle = tooltip ? {
        left: `${(tooltip.x / SVG_SIZE) * 100}%`,
        top: `${(tooltip.y / SVG_SIZE) * 100}%`,
    } : undefined;

    return (
        <div className="ww-container">
            {/* Header */}
            <div className="ww-header">
                <h3>{data.batsmanName}</h3>
                <div className="ww-subtitle">
                    {data.totalRuns} runs off {data.totalShots} balls
                </div>
            </div>

            {/* SVG Ground */}
            <div className="ww-svg-wrapper">
                <svg
                    className="ww-svg"
                    viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <GroundSVG />

                    {/* Shot lines */}
                    {plottableShots.map(shot => (
                        <ShotLine
                            key={shot.ballId}
                            shot={shot}
                            onHover={handleHover}
                            onLeave={handleLeave}
                        />
                    ))}
                </svg>

                {/* Tooltip overlay */}
                {tooltip && tooltipStyle && (
                    <div className="ww-tooltip" style={tooltipStyle}>
                        <div className="ww-tooltip-runs" style={{
                            color: getShotColor(tooltip.shot.runs, tooltip.shot.isSix, tooltip.shot.isBoundary, tooltip.shot.isWicket),
                        }}>
                            {tooltip.shot.isSix ? 'SIX!' :
                                tooltip.shot.isBoundary ? 'FOUR!' :
                                    tooltip.shot.isWicket ? 'WICKET' :
                                        `${tooltip.shot.runs} run${tooltip.shot.runs !== 1 ? 's' : ''}`}
                        </div>
                        <div className="ww-tooltip-detail">
                            Ov {tooltip.shot.overNumber}.{tooltip.shot.ballNumber} · vs {tooltip.shot.bowlerName}
                            {tooltip.shot.shotZone && ` · ${tooltip.shot.shotZone.replace(/_/g, ' ')}`}
                        </div>
                    </div>
                )}
            </div>

            {/* Color Legend */}
            <div className="ww-legend">
                <div className="ww-legend-item">
                    <div className="ww-legend-dot" style={{ background: '#4A5568' }} />
                    <span>Dot</span>
                </div>
                <div className="ww-legend-item">
                    <div className="ww-legend-dot" style={{ background: '#ECC94B' }} />
                    <span>1–2</span>
                </div>
                <div className="ww-legend-item">
                    <div className="ww-legend-dot" style={{ background: '#D69E2E' }} />
                    <span>3</span>
                </div>
                <div className="ww-legend-item">
                    <div className="ww-legend-dot" style={{ background: '#38A169' }} />
                    <span>Four</span>
                </div>
                <div className="ww-legend-item">
                    <div className="ww-legend-dot" style={{ background: '#E53E3E' }} />
                    <span>Six/W</span>
                </div>
            </div>

            {/* Stats */}
            <div className="ww-stats">
                <div className="ww-stat">
                    <div className="ww-stat-value">{data.totalRuns}</div>
                    <div className="ww-stat-label">Runs</div>
                </div>
                <div className="ww-stat">
                    <div className="ww-stat-value">{data.totalShots}</div>
                    <div className="ww-stat-label">Balls</div>
                </div>
                <div className="ww-stat">
                    <div className="ww-stat-value">{data.boundaries}</div>
                    <div className="ww-stat-label">Fours</div>
                </div>
                <div className="ww-stat">
                    <div className="ww-stat-value">{data.sixes}</div>
                    <div className="ww-stat-label">Sixes</div>
                </div>
                <div className="ww-stat">
                    <div className="ww-stat-value">
                        {data.totalShots > 0 ? ((data.totalRuns / data.totalShots) * 100).toFixed(1) : '0.0'}
                    </div>
                    <div className="ww-stat-label">SR</div>
                </div>
            </div>

            {/* Zone Breakdown */}
            {data.zoneSummary.length > 0 && (
                <div className="ww-zones">
                    {data.zoneSummary.map(zone => (
                        <div key={zone.zone} className="ww-zone-chip">
                            <div className="ww-zone-dot" style={{
                                background: zone.boundaries > 0 ? '#38A169' : '#D7A65B',
                            }} />
                            <span>{zone.zone.replace(/_/g, ' ')}</span>
                            <span className="ww-zone-pct">{zone.percentage}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Export memoized component
const WagonWheel = memo(WagonWheelInner);
export default WagonWheel;
