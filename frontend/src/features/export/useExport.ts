/**
 * useExport.ts — Export hook (local state, no Zustand)
 *
 * Rules:
 * - No global state
 * - No Zustand store
 * - Resets on unmount
 * - Hidden DOM removed in finally
 * - Worker terminated after completion
 * - Debounced 500ms
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { fetchArchiveExport, generateFilename, downloadBlob } from './exportService';
import type { ArchivedMatchFull } from '../archive/types';
import type { ExportStatus, SerializedScorecard, WorkerInput, WorkerOutput } from './types';
import { INITIAL_EXPORT_STATUS, WORKER_THRESHOLD } from './types';

// Pure engine (main thread only, for ≤200 events)
import {
    reconstructMatchState,
    filterEventsForCurrentPhase,
    deriveBatsmanStats,
    deriveBowlingStats,
    deriveFallOfWickets,
} from '../scoring/engine/replayPure';

export function useExport(archiveId: string, archive: ArchivedMatchFull | null) {
    const [status, setStatus] = useState<ExportStatus>({ ...INITIAL_EXPORT_STATUS });
    const workerRef = useRef<Worker | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hiddenDomRef = useRef<HTMLDivElement | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            removeHiddenDOM();
        };
    }, []);

    // ─── Hidden DOM Management ───

    function createHiddenDOM(scorecard: SerializedScorecard, archive: ArchivedMatchFull): HTMLDivElement {
        const container = document.createElement('div');
        container.id = '__export-hidden-dom';
        container.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;background:#fff;padding:32px;font-family:system-ui,sans-serif;';

        container.innerHTML = `
            <div style="text-align:center;margin-bottom:24px;">
                <h1 style="font-size:20px;margin:0 0 4px;">🏏 CricScore Match Report</h1>
                <h2 style="font-size:16px;margin:0 0 8px;color:#333;">
                    ${archive.homeTeamName} vs ${archive.awayTeamName}
                </h2>
                <p style="font-size:12px;color:#666;">
                    ${new Date(archive.matchDate).toLocaleDateString()} · ${archive.overs} overs · Engine v${archive.engineVersion}
                </p>
                ${archive.result ? `<p style="font-size:14px;font-weight:600;color:#2563eb;margin-top:8px;">${archive.result}</p>` : ''}
                ${scorecard.displayScore ? `
                    <p style="font-size:24px;font-weight:700;margin-top:12px;">
                        ${scorecard.displayScore.totalRuns}/${scorecard.displayScore.totalWickets}
                        <span style="font-size:14px;color:#666;"> (${scorecard.displayScore.overs} ov)</span>
                    </p>
                ` : ''}
            </div>

            ${scorecard.batsmanStats.length > 0 ? `
            <div style="margin-bottom:20px;">
                <h3 style="font-size:14px;margin:0 0 8px;">🏏 Batting</h3>
                <table style="width:100%;border-collapse:collapse;font-size:11px;">
                    <thead>
                        <tr style="border-bottom:2px solid #e5e7eb;text-align:left;">
                            <th style="padding:4px 8px;">Batter</th>
                            <th style="padding:4px 8px;text-align:right;">R</th>
                            <th style="padding:4px 8px;text-align:right;">B</th>
                            <th style="padding:4px 8px;text-align:right;">4s</th>
                            <th style="padding:4px 8px;text-align:right;">6s</th>
                            <th style="padding:4px 8px;text-align:right;">SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scorecard.batsmanStats.map(b => `
                        <tr style="border-bottom:1px solid #f3f4f6;">
                            <td style="padding:4px 8px;">${b.playerId}</td>
                            <td style="padding:4px 8px;text-align:right;font-weight:600;">${b.runs}</td>
                            <td style="padding:4px 8px;text-align:right;">${b.balls}</td>
                            <td style="padding:4px 8px;text-align:right;">${b.fours}</td>
                            <td style="padding:4px 8px;text-align:right;">${b.sixes}</td>
                            <td style="padding:4px 8px;text-align:right;">${b.strikeRate}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${scorecard.bowlingStats.length > 0 ? `
            <div style="margin-bottom:20px;">
                <h3 style="font-size:14px;margin:0 0 8px;">🎳 Bowling</h3>
                <table style="width:100%;border-collapse:collapse;font-size:11px;">
                    <thead>
                        <tr style="border-bottom:2px solid #e5e7eb;text-align:left;">
                            <th style="padding:4px 8px;">Bowler</th>
                            <th style="padding:4px 8px;text-align:right;">O</th>
                            <th style="padding:4px 8px;text-align:right;">R</th>
                            <th style="padding:4px 8px;text-align:right;">W</th>
                            <th style="padding:4px 8px;text-align:right;">Eco</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scorecard.bowlingStats.map(b => `
                        <tr style="border-bottom:1px solid #f3f4f6;">
                            <td style="padding:4px 8px;">${b.bowlerId}</td>
                            <td style="padding:4px 8px;text-align:right;">${b.overs}</td>
                            <td style="padding:4px 8px;text-align:right;">${b.runsConceded}</td>
                            <td style="padding:4px 8px;text-align:right;font-weight:600;">${b.wickets}</td>
                            <td style="padding:4px 8px;text-align:right;">${b.economy}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${scorecard.fallOfWickets.length > 0 ? `
            <div style="margin-bottom:20px;">
                <h3 style="font-size:14px;margin:0 0 8px;">Fall of Wickets</h3>
                <p style="font-size:11px;color:#333;">
                    ${scorecard.fallOfWickets.map(f => `${f.score} (${f.over})`).join(' · ')}
                </p>
            </div>
            ` : ''}

            <div style="text-align:center;padding-top:16px;border-top:1px solid #e5e7eb;">
                <p style="font-size:10px;color:#999;">Generated by CricScore · ${new Date().toISOString()}</p>
            </div>
        `;

        document.body.appendChild(container);
        hiddenDomRef.current = container;
        return container;
    }

    function removeHiddenDOM(): void {
        if (hiddenDomRef.current) {
            document.body.removeChild(hiddenDomRef.current);
            hiddenDomRef.current = null;
        }
    }

    // ─── Main Thread Scorecard Computation (≤200 events) ───

    function computeScorecardMainThread(archive: ArchivedMatchFull): SerializedScorecard {
        const events = archive.events.map(e => e.payload);
        const config = archive.matchConfig;

        const engineConfig = {
            matchId: archive.matchId,
            teamA: { id: 'export-a', name: config.homeTeamName, players: [] as string[] },
            teamB: { id: 'export-b', name: config.awayTeamName, players: [] as string[] },
            oversPerInnings: config.overs,
        };

        const matchState = reconstructMatchState(engineConfig, events);
        const phaseEvents = filterEventsForCurrentPhase(events, matchState.matchPhase);
        const batsmanStats = deriveBatsmanStats(phaseEvents, 0);
        const bowlingStats = deriveBowlingStats(phaseEvents, 0);
        const fallOfWickets = deriveFallOfWickets(phaseEvents, 0);

        let totalRuns = 0;
        let totalWickets = 0;
        for (const b of batsmanStats) totalRuns += b.runs;
        for (const b of bowlingStats) totalWickets += b.wickets;

        const totalBalls = phaseEvents.filter(e =>
            e.type !== 'EXTRA' && e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION'
        ).length;
        const completedOvers = Math.floor(totalBalls / 6);
        const remainingBalls = totalBalls % 6;
        const oversStr = `${completedOvers}.${remainingBalls}`;
        const totalOversDec = completedOvers + remainingBalls / 6;
        const crr = totalOversDec > 0 ? (totalRuns / totalOversDec).toFixed(2) : '0.00';

        return {
            batsmanStats, bowlingStats, fallOfWickets,
            displayScore: { totalRuns, totalWickets, overs: oversStr, crr },
        };
    }

    // ─── JSON Export ───

    const exportJSON = useCallback(async () => {
        if (!archive || status.isExporting) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setStatus({ isExporting: true, format: 'json', progress: 0, error: null });

            try {
                setStatus(s => ({ ...s, progress: 30 }));
                const data = await fetchArchiveExport(archiveId);

                setStatus(s => ({ ...s, progress: 80 }));
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                downloadBlob(blob, generateFilename(archive, 'json'));

                setStatus(s => ({ ...s, progress: 100, isExporting: false, format: null }));
            } catch (err: any) {
                setStatus(s => ({ ...s, error: err?.message || 'JSON export failed', isExporting: false }));
            }
        }, 500);
    }, [archive, archiveId, status.isExporting]);

    // ─── PDF Export ───

    const exportPDF = useCallback(async () => {
        if (!archive || status.isExporting) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setStatus({ isExporting: true, format: 'pdf', progress: 0, error: null });

            try {
                let scorecard: SerializedScorecard;

                if (archive.eventCount > WORKER_THRESHOLD) {
                    // Mode B: Web Worker for >200 events
                    scorecard = await computeViaWorker(archive);
                } else {
                    // Mode A: Main thread for ≤200 events
                    scorecard = computeScorecardMainThread(archive);
                }

                setStatus(s => ({ ...s, progress: 30 }));

                // Render hidden DOM
                const container = createHiddenDOM(scorecard, archive);

                try {
                    // html2canvas (30-80%)
                    setStatus(s => ({ ...s, progress: 40 }));
                    const canvas = await html2canvas(container, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                    });

                    setStatus(s => ({ ...s, progress: 80 }));

                    // jsPDF (80-100%)
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'px',
                        format: [canvas.width, canvas.height],
                    });
                    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                    pdf.save(generateFilename(archive, 'pdf'));

                    setStatus(s => ({ ...s, progress: 100, isExporting: false, format: null }));
                } finally {
                    // MANDATORY: remove hidden DOM even on error
                    removeHiddenDOM();
                }
            } catch (err: any) {
                setStatus(s => ({ ...s, error: err?.message || 'PDF export failed', isExporting: false }));
                // Ensure cleanup
                removeHiddenDOM();
                workerRef.current?.terminate();
                workerRef.current = null;
            }
        }, 500);
    }, [archive, status.isExporting]);

    // ─── Worker Communication ───

    function computeViaWorker(archive: ArchivedMatchFull): Promise<SerializedScorecard> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(
                new URL('./exportWorker.ts', import.meta.url),
                { type: 'module' }
            );
            workerRef.current = worker;

            worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
                // MANDATORY: terminate worker after completion
                worker.terminate();
                workerRef.current = null;

                if (e.data.success && e.data.data) {
                    resolve(e.data.data);
                } else {
                    reject(new Error(e.data.error || 'Worker computation failed'));
                }
            };

            worker.onerror = (err) => {
                worker.terminate();
                workerRef.current = null;
                reject(new Error(err.message || 'Worker error'));
            };

            const input: WorkerInput = {
                events: archive.events.map(e => e.payload),
                matchConfig: {
                    matchId: archive.matchId,
                    overs: archive.matchConfig.overs,
                    homeTeamName: archive.matchConfig.homeTeamName,
                    awayTeamName: archive.matchConfig.awayTeamName,
                },
            };

            worker.postMessage(input);
        });
    }

    // ─── Cancel ───

    const cancel = useCallback(() => {
        workerRef.current?.terminate();
        workerRef.current = null;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        removeHiddenDOM();
        setStatus({ ...INITIAL_EXPORT_STATUS });
    }, []);

    return { status, exportJSON, exportPDF, cancel };
}
