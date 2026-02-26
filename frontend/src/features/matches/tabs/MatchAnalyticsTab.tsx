import React from "react";
import { useScoringStore } from "../../scoring/scoringStore";
import { clsx } from "clsx";

// ─── Sections ───

const RunRateGraph: React.FC = () => {
    const data = useScoringStore((s) => s.getRunRateProgression());

    if (data.length === 0) {
        return <EmptySection label="Run Rate" />;
    }

    const maxRR = Math.max(...data.map((d) => d.runRate), 1);

    return (
        <AnalyticsCard title="📈 Run Rate Progression">
            <div className="flex items-end gap-1 h-32">
                {data.map((point) => (
                    <div key={point.over} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                            {point.runRate}
                        </span>
                        <div
                            className="w-full bg-primary/80 rounded-t-sm transition-all duration-300"
                            style={{ height: `${(point.runRate / maxRR) * 100}%`, minHeight: 4 }}
                        />
                        <span className="text-[10px] text-muted-foreground">{point.over}</span>
                    </div>
                ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>Over →</span>
                <span>CRR: {data[data.length - 1]?.runRate ?? "—"}</span>
            </div>
        </AnalyticsCard>
    );
};

const MomentumBar: React.FC = () => {
    const momentum = useScoringStore((s) => s.getMomentum());

    const trendColors = {
        UP: "bg-success text-success",
        DOWN: "bg-destructive text-destructive",
        STABLE: "bg-warning text-warning",
    };

    const trendEmoji = { UP: "🔥", DOWN: "❄️", STABLE: "⚖️" };
    const clampedWidth = Math.min(Math.abs(momentum.impact) * 5, 100);

    return (
        <AnalyticsCard title="🔥 Momentum">
            <div className="flex items-center gap-3">
                <div className="flex-1 h-6 bg-cardAlt rounded-full overflow-hidden relative">
                    <div
                        className={clsx(
                            "h-full rounded-full transition-all duration-500",
                            trendColors[momentum.trend].split(" ")[0]
                        )}
                        style={{
                            width: `${clampedWidth}%`,
                            marginLeft: momentum.impact >= 0 ? "50%" : `${50 - clampedWidth}%`,
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-px h-full bg-border" />
                    </div>
                </div>
                <span className={clsx("text-lg font-bold", trendColors[momentum.trend].split(" ")[1])}>
                    {trendEmoji[momentum.trend]} {momentum.impact > 0 ? "+" : ""}{momentum.impact}
                </span>
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>← Bowling</span>
                <span className="uppercase font-medium">{momentum.trend}</span>
                <span>Batting →</span>
            </div>
        </AnalyticsCard>
    );
};

const PressureMeter: React.FC = () => {
    const pressure = useScoringStore((s) => s.getPressureIndex());

    if (!pressure) return null; // Not in chase

    const levelColors: Record<string, string> = {
        LOW: "text-success",
        MEDIUM: "text-warning",
        HIGH: "text-orange-500",
        EXTREME: "text-destructive",
    };

    const levelBg: Record<string, string> = {
        LOW: "bg-success/20",
        MEDIUM: "bg-warning/20",
        HIGH: "bg-orange-500/100/20",
        EXTREME: "bg-destructive/20",
    };

    return (
        <AnalyticsCard title="🎯 Pressure Index">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">CRR</span>
                    <span className="text-xl font-bold tabular-nums">{pressure.currentRate}</span>
                </div>
                <div className={clsx("px-4 py-2 rounded-lg", levelBg[pressure.pressureLevel])}>
                    <span className={clsx("text-sm font-bold uppercase", levelColors[pressure.pressureLevel])}>
                        {pressure.pressureLevel}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground">RRR</span>
                    <span className="text-xl font-bold tabular-nums">{pressure.requiredRate}</span>
                </div>
            </div>
            <div className="mt-2 h-2 bg-cardAlt rounded-full overflow-hidden">
                <div
                    className={clsx("h-full rounded-full transition-all duration-500", {
                        "bg-success": pressure.pressureLevel === "LOW",
                        "bg-warning": pressure.pressureLevel === "MEDIUM",
                        "bg-orange-500/100": pressure.pressureLevel === "HIGH",
                        "bg-destructive": pressure.pressureLevel === "EXTREME",
                    })}
                    style={{ width: `${Math.min(Math.max(pressure.pressureGap, 0) * 25, 100)}%` }}
                />
            </div>
        </AnalyticsCard>
    );
};

const PhaseTable: React.FC = () => {
    const phases = useScoringStore((s) => s.getPhaseStats());

    if (phases.length === 0 || phases.every((p) => p.balls === 0)) {
        return <EmptySection label="Phase Breakdown" />;
    }

    const phaseLabels = { POWERPLAY: "Powerplay", MIDDLE: "Middle", DEATH: "Death" };
    const phaseEmoji = { POWERPLAY: "⚡", MIDDLE: "🏏", DEATH: "💀" };

    return (
        <AnalyticsCard title="🏏 Phase Breakdown">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-muted-foreground text-xs border-b border-border">
                            <th className="text-left py-1 font-medium">Phase</th>
                            <th className="text-right py-1 font-medium">Runs</th>
                            <th className="text-right py-1 font-medium">Wkts</th>
                            <th className="text-right py-1 font-medium">RR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {phases.filter((p) => p.balls > 0).map((p) => (
                            <tr key={p.phase} className="border-b border-border/50">
                                <td className="py-2 font-medium">
                                    {phaseEmoji[p.phase]} {phaseLabels[p.phase]}
                                </td>
                                <td className="text-right py-2 tabular-nums">{p.runs}</td>
                                <td className="text-right py-2 tabular-nums">{p.wickets}</td>
                                <td className="text-right py-2 tabular-nums font-medium">{p.runRate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AnalyticsCard>
    );
};

const WinProbabilityBar: React.FC = () => {
    const wp = useScoringStore((s) => s.getWinProbability());

    if (!wp) return null; // Not in chase or match complete

    return (
        <AnalyticsCard title="📊 Win Probability">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium w-8 text-right">{wp.battingTeam}%</span>
                <div className="flex-1 h-5 bg-cardAlt rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-primary transition-all duration-500 rounded-l-full"
                        style={{ width: `${wp.battingTeam}%` }}
                    />
                    <div
                        className="h-full bg-destructive/70 transition-all duration-500 rounded-r-full"
                        style={{ width: `${wp.bowlingTeam}%` }}
                    />
                </div>
                <span className="text-xs font-medium w-8">{wp.bowlingTeam}%</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>🏏 Batting</span>
                <span>🎳 Bowling</span>
            </div>
        </AnalyticsCard>
    );
};

// ─── Shared Components ───

const AnalyticsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {children}
    </div>
);

const EmptySection: React.FC<{ label: string }> = ({ label }) => (
    <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
        <p className="text-muted-foreground text-sm">{label} — No data yet</p>
    </div>
);

// ─── Main Tab ───

export const MatchAnalyticsTab = () => {
    return (
        <div className="py-4 space-y-3">
            <RunRateGraph />
            <MomentumBar />
            <PressureMeter />
            <PhaseTable />
            <WinProbabilityBar />
        </div>
    );
};
