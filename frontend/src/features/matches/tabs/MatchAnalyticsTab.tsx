import React from "react";
import { useScoringStore } from "../../scoring/scoringStore";
import { clsx } from "clsx";
import { TrendingUp, Flame, Target, BarChart3, Percent } from 'lucide-react';

// ─── Sections ───

const RunRateGraph: React.FC = () => {
    const data = useScoringStore((s) => s.getRunRateProgression());

    if (data.length === 0) {
        return <EmptySection label="Run Rate" />;
    }

    const maxRR = Math.max(...data.map((d) => d.runRate), 1);

    return (
        <AnalyticsCard icon={<TrendingUp className="w-4 h-4 text-primary" />} title="Run Rate Progression">
            <div className="flex items-end gap-1 h-32">
                {data.map((point) => (
                    <div key={point.over} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                            {point.runRate}
                        </span>
                        <div
                            className="w-full bg-primary/70 rounded-t-md transition-all duration-300 hover:bg-primary"
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
        UP: "bg-emerald-500 text-emerald-400",
        DOWN: "bg-destructive text-destructive",
        STABLE: "bg-amber-500 text-amber-400",
    };

    const trendIcons = { UP: "▲", DOWN: "▼", STABLE: "■" };
    const clampedWidth = Math.min(Math.abs(momentum.impact) * 5, 100);

    return (
        <AnalyticsCard icon={<Flame className="w-4 h-4 text-primary" />} title="Momentum">
            <div className="flex items-center gap-3">
                <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden relative">
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
                <span className={clsx("text-lg font-bold tabular-nums", trendColors[momentum.trend].split(" ")[1])}>
                    {trendIcons[momentum.trend]} {momentum.impact > 0 ? "+" : ""}{momentum.impact}
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

    if (!pressure) return null;

    const levelColors: Record<string, string> = {
        LOW: "text-emerald-400",
        MEDIUM: "text-amber-400",
        HIGH: "text-orange-400",
        EXTREME: "text-destructive",
    };

    const levelBg: Record<string, string> = {
        LOW: "bg-emerald-500/15",
        MEDIUM: "bg-amber-500/15",
        HIGH: "bg-orange-500/15",
        EXTREME: "bg-destructive/15",
    };

    return (
        <AnalyticsCard icon={<Target className="w-4 h-4 text-primary" />} title="Pressure Index">
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
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                    className={clsx("h-full rounded-full transition-all duration-500", {
                        "bg-emerald-500": pressure.pressureLevel === "LOW",
                        "bg-amber-500": pressure.pressureLevel === "MEDIUM",
                        "bg-orange-500": pressure.pressureLevel === "HIGH",
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
    const phaseIcons = { POWERPLAY: "⚡", MIDDLE: "🏏", DEATH: "💀" };

    return (
        <AnalyticsCard icon={<BarChart3 className="w-4 h-4 text-primary" />} title="Phase Breakdown">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-muted-foreground text-xs border-b border-border">
                            <th className="text-left py-1.5 font-medium">Phase</th>
                            <th className="text-right py-1.5 font-medium">Runs</th>
                            <th className="text-right py-1.5 font-medium">Wkts</th>
                            <th className="text-right py-1.5 font-medium">RR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {phases.filter((p) => p.balls > 0).map((p) => (
                            <tr key={p.phase} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                                <td className="py-2 font-medium">
                                    {phaseIcons[p.phase]} {phaseLabels[p.phase]}
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

    if (!wp) return null;

    return (
        <AnalyticsCard icon={<Percent className="w-4 h-4 text-primary" />} title="Win Probability">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium w-8 text-right tabular-nums">{wp.battingTeam}%</span>
                <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-primary transition-all duration-500 rounded-l-full"
                        style={{ width: `${wp.battingTeam}%` }}
                    />
                    <div
                        className="h-full bg-destructive/70 transition-all duration-500 rounded-r-full"
                        style={{ width: `${wp.bowlingTeam}%` }}
                    />
                </div>
                <span className="text-xs font-medium w-8 tabular-nums">{wp.bowlingTeam}%</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>🏏 Batting</span>
                <span>🎳 Bowling</span>
            </div>
        </AnalyticsCard>
    );
};

// ─── Shared Components ───

const AnalyticsCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {icon}
            {title}
        </h3>
        {children}
    </div>
);

const EmptySection: React.FC<{ label: string }> = ({ label }) => (
    <div className="bg-card rounded-xl border border-dashed border-border/50 p-6 text-center">
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
