import React, { useEffect, useRef, useState } from 'react';
import { useScoringStore } from '../scoringStore';
import type { Milestone, MilestoneType } from '../engine/types/milestoneTypes';
import { clsx } from 'clsx';
import { Trophy, Flame, Target, Star } from 'lucide-react';

export const MilestoneWatcher: React.FC = () => {
    // We call getMilestones() so React re-evaluates when milestone array changes.
    // This is safe since our derive function is pure.
    const milestones = useScoringStore((s) => s.getMilestones());

    const prevCountRef = useRef<number>(milestones.length);
    const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

    useEffect(() => {
        const currentCount = milestones.length;
        const prevCount = prevCountRef.current;

        if (currentCount > prevCount) {
            // New milestone(s) added! Grab the latest one.
            const newest = milestones[currentCount - 1];
            setActiveMilestone(newest);

            // Auto-hide after 3 seconds
            const timer = setTimeout(() => {
                setActiveMilestone(null);
            }, 3000);

            // Cleanup timer if another milestone fires or unmounts
            return () => clearTimeout(timer);
        }

        // If count decreased (due to Undo), just update the ref, clear active if any
        if (currentCount < prevCount) {
            setActiveMilestone(null);
        }

        prevCountRef.current = currentCount;
    }, [milestones]);

    if (!activeMilestone) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-sm px-4">
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border overflow-hidden animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="bg-gradient-to-r from-brand to-brand/80 p-1" />
                <div className="p-4 flex items-center gap-4 bg-surface">
                    <MilestoneIcon type={activeMilestone.type} />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-textPrimary uppercase tracking-wide">
                            {getMilestoneTitle(activeMilestone.type)}
                        </span>
                        <span className="text-xs text-textSecondary font-medium">
                            {getMilestoneSubtitle(activeMilestone)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Formatting Helpers ───

function getMilestoneTitle(type: MilestoneType): string {
    switch (type) {
        case "BATTER_50": return "Half Century!";
        case "BATTER_100": return "Century!";
        case "BATTER_150": return "150 Runs!";
        case "BOWLER_3W": return "3-Wicket Haul!";
        case "BOWLER_5W": return "5-Wicket Haul!";
        case "HATTRICK": return "Hat-Trick!";
        case "PARTNERSHIP_50": return "50 Partnership!";
        case "PARTNERSHIP_100": return "100 Partnership!";
        case "TEAM_100": return "Team 100!";
        case "TEAM_200": return "Team 200!";
        case "TEAM_300": return "Team 300!";
    }
}

function getMilestoneSubtitle(m: Milestone): string {
    if (m.playerId) return m.playerId;
    if (m.type.startsWith("PARTNERSHIP_")) return "Great batting display";
    if (m.type.startsWith("TEAM_")) return "Solid innings";
    return "What a moment";
}

const MilestoneIcon: React.FC<{ type: MilestoneType }> = ({ type }) => {
    let Icon = Star;
    let bgColor = "bg-brand/10";
    let iconColor = "text-brand";

    if (type.startsWith("BATTER_")) {
        Icon = Trophy;
        bgColor = "bg-warning/10";
        iconColor = "text-warning";
    } else if (type === "HATTRICK") {
        Icon = Flame;
        bgColor = "bg-orange-500/10";
        iconColor = "text-orange-500";
    } else if (type.startsWith("BOWLER_")) {
        Icon = Target;
        bgColor = "bg-danger/10";
        iconColor = "text-danger";
    }

    return (
        <div className={clsx("p-3 rounded-full flex-shrink-0 flex items-center justify-center", bgColor)}>
            <Icon className={clsx("w-6 h-6", iconColor)} />
        </div>
    );
};
