import React, { useState, useEffect } from 'react';
import { useScoringStore } from '../scoringStore';
import { engineMetrics, resetMetrics } from './engineMetrics';

/**
 * EngineDevPanel — DEV-ONLY floating diagnostics overlay.
 *
 * Shows real-time bundle cache behavior, lazy layer activations,
 * replay timing, and event counts. Auto-refreshes every 500ms.
 *
 * Stripped entirely from production builds via import.meta.env.PROD guard.
 */
export const EngineDevPanel: React.FC = () => {
    // Guard: never render in production
    if (import.meta.env.PROD) return null;

    const [, setTick] = useState(0);
    const [collapsed, setCollapsed] = useState(false);

    const events = useScoringStore((s) => s.events);
    const replayIndex = useScoringStore((s) => s.replayIndex);

    // Auto-refresh metrics display
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 500);
        return () => clearInterval(id);
    }, []);

    const hitRatio = engineMetrics.bundleHits + engineMetrics.bundleMisses > 0
        ? ((engineMetrics.bundleHits / (engineMetrics.bundleHits + engineMetrics.bundleMisses)) * 100).toFixed(1)
        : '—';

    if (collapsed) {
        return (
            <button
                onClick={() => setCollapsed(false)}
                className="fixed bottom-4 right-4 z-[9999] bg-black/90 text-green-400 text-xs font-mono px-3 py-2 rounded-lg shadow-xl border border-green-800/50 hover:bg-black"
            >
                ⚡ DEV
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-72 z-[9999] bg-black/95 text-green-400 text-[11px] font-mono rounded-lg shadow-2xl border border-green-800/40 overflow-hidden select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-green-900/20 border-b border-green-800/30">
                <span className="font-bold text-green-300 tracking-wide">⚡ ENGINE DIAGNOSTICS</span>
                <div className="flex gap-1.5">
                    <button onClick={() => resetMetrics()} className="text-yellow-400 hover:text-yellow-200" title="Reset">⟳</button>
                    <button onClick={() => setCollapsed(true)} className="text-green-500 hover:text-green-200" title="Collapse">▾</button>
                </div>
            </div>

            {/* Body */}
            <div className="px-3 py-2.5 space-y-2">
                {/* Event State */}
                <div className="space-y-0.5">
                    <div className="text-primary font-bold text-[10px] uppercase tracking-wider mb-0.5">Event State</div>
                    <Row label="Total Events" value={events.length} />
                    <Row label="Replay Index" value={replayIndex !== null ? replayIndex : 'LIVE'} highlight={replayIndex !== null} />
                    <Row label="Effective Events" value={replayIndex !== null ? replayIndex : events.length} />
                </div>

                {/* Bundle Cache */}
                <div className="space-y-0.5">
                    <div className="text-primary font-bold text-[10px] uppercase tracking-wider mb-0.5">Bundle Cache</div>
                    <Row label="Hits" value={engineMetrics.bundleHits} good />
                    <Row label="Misses" value={engineMetrics.bundleMisses} warn={engineMetrics.bundleMisses > 50} />
                    <Row label="Hit Ratio" value={`${hitRatio}%`} good={Number(hitRatio) > 90} />
                    <Row label="Replay Time" value={`${engineMetrics.lastReplayDurationMs.toFixed(2)} ms`} warn={engineMetrics.lastReplayDurationMs > 5} />
                </div>

                {/* Lazy Layers */}
                <div className="space-y-0.5">
                    <div className="text-primary font-bold text-[10px] uppercase tracking-wider mb-0.5">Lazy Layers</div>
                    <Row label="reconstruct()" value={engineMetrics.reconstructCalls} />
                    <Row label="Phase Layer" value={engineMetrics.phaseLayerCalls} />
                    <Row label="Analytics Layer" value={engineMetrics.analyticsLayerCalls} />
                    <Row label="Broadcast Layer" value={engineMetrics.broadcastLayerCalls} />
                    <Row label="filterPhase()" value={engineMetrics.filterPhaseCalls} />
                </div>
            </div>
        </div>
    );
};

// ─── Row Helper ───

interface RowProps {
    label: string;
    value: string | number;
    good?: boolean;
    warn?: boolean;
    highlight?: boolean;
}

const Row: React.FC<RowProps> = ({ label, value, good, warn, highlight }) => (
    <div className="flex justify-between">
        <span className="text-primary">{label}</span>
        <span className={
            warn ? 'text-yellow-400 font-bold' :
                good ? 'text-emerald-300' :
                    highlight ? 'text-cyan-300 font-bold' :
                        'text-green-300'
        }>
            {value}
        </span>
    </div>
);
