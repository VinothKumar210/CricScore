/**
 * engineMetrics.ts — DEV-ONLY Performance Metrics Tracker
 *
 * Mutable singleton counters tracking bundle cache behavior,
 * lazy layer invocations, and replay timing.
 *
 * Zero production overhead — only read by EngineDevPanel.
 * Tree-shaken in production builds when no consumer imports it.
 */

export interface EngineMetrics {
    bundleHits: number;
    bundleMisses: number;
    reconstructCalls: number;
    phaseLayerCalls: number;
    analyticsLayerCalls: number;
    broadcastLayerCalls: number;
    filterPhaseCalls: number;
    lastReplayDurationMs: number;
}

export const engineMetrics: EngineMetrics = {
    bundleHits: 0,
    bundleMisses: 0,
    reconstructCalls: 0,
    phaseLayerCalls: 0,
    analyticsLayerCalls: 0,
    broadcastLayerCalls: 0,
    filterPhaseCalls: 0,
    lastReplayDurationMs: 0,
};

export function resetMetrics(): void {
    engineMetrics.bundleHits = 0;
    engineMetrics.bundleMisses = 0;
    engineMetrics.reconstructCalls = 0;
    engineMetrics.phaseLayerCalls = 0;
    engineMetrics.analyticsLayerCalls = 0;
    engineMetrics.broadcastLayerCalls = 0;
    engineMetrics.filterPhaseCalls = 0;
    engineMetrics.lastReplayDurationMs = 0;
}
