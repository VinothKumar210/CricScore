import React, { useState } from 'react';
import { runAllDiagnostics } from '../../features/scoring/engine/testing/runEngineDiagnostics';
import { Activity, Play, CheckCircle2, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const EngineTestPage: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState<"IDLE" | "SUCCESS" | "FAILED">("IDLE");

    const handleRunDiagnostics = async () => {
        setIsRunning(true);
        setStatus("IDLE");
        setLogs(["Starting Engine Diagnostics..."]);

        // Small delay to let UI render the starting state
        await new Promise(r => setTimeout(r, 100));

        const outputLogs = runAllDiagnostics();
        setLogs(outputLogs);

        const hasFailure = outputLogs.some((log: string) => log.includes("✘") || log.includes("❌"));
        setStatus(hasFailure ? "FAILED" : "SUCCESS");
        setIsRunning(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-border p-8">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flexItemsCenter justify-center flex">
                        <Activity className="w-6 h-6 text-brand" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textPrimary">Deterministic Engine Diagnostics</h1>
                        <p className="text-sm text-textSecondary mt-1">
                            Run programmatic validation of the event-sourced scoring engines.
                        </p>
                    </div>
                    <div className="ml-auto">
                        <button
                            onClick={handleRunDiagnostics}
                            disabled={isRunning}
                            className={clsx(
                                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-sm",
                                isRunning
                                    ? "bg-gray-100 text-textSecondary cursor-not-allowed"
                                    : "bg-brand text-white hover:bg-brand/90 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                            )}
                        >
                            <Play className={clsx("w-5 h-5", isRunning && "animate-pulse")} />
                            {isRunning ? "Running Suite..." : "Run Diagnostics"}
                        </button>
                    </div>
                </div>

                {/* Status Indicator */}
                {status !== "IDLE" && (
                    <div className={clsx(
                        "mb-6 p-4 rounded-xl flex items-center gap-4 border",
                        status === "SUCCESS" ? "bg-success/5 border-success/20 text-success" : "bg-danger/5 border-danger/20 text-danger"
                    )}>
                        {status === "SUCCESS" ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                        <div>
                            <h3 className="text-lg font-bold">
                                {status === "SUCCESS" ? "All Systems Go" : "Engine Degradation Detected"}
                            </h3>
                            <p className="text-sm opacity-90">
                                {status === "SUCCESS"
                                    ? "The scoring engine is fully deterministic. Safe to deploy."
                                    : "Non-deterministic behavior found. Do not deploy."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Terminal Window */}
                <div className="bg-gray-900 rounded-xl overflow-hidden shadow-inner border border-gray-800">
                    <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        </div>
                        <span className="text-gray-400 text-xs font-mono ml-4">engine-test-runner.ts</span>
                    </div>
                    <div className="p-4 h-[500px] overflow-y-auto font-mono text-sm">
                        {logs.length === 0 ? (
                            <div className="text-gray-500 italic flex items-center justify-center h-full">
                                Ready to run diagnostics.
                            </div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className={clsx(
                                    "py-0.5 break-all",
                                    log.includes("✔") ? "text-green-400" :
                                        log.includes("✘") ? "text-red-400" :
                                            log.includes("===") ? "text-gray-500" :
                                                log.startsWith("▶") ? "text-blue-400 font-bold mt-2" :
                                                    "text-gray-300"
                                )}>
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
