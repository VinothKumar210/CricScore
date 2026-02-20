import { useEffect, useRef } from 'react';
import { useScoringStore } from '../scoringStore';
import type { Milestone } from '../engine/types/milestoneTypes';

export function useEventNotifier(onNotify: (message: string) => void) {
    const milestones = useScoringStore((s) => s.getMilestones());
    const commentary = useScoringStore((s) => s.getCommentary()); // Note: this array is REVERSE chronological!
    const matchState = useScoringStore((s) => s.matchState);
    const derivedState = useScoringStore((s) => s.derivedState);
    const replayIndex = useScoringStore((s) => s.replayIndex);

    const isInitialLoad = useRef(true);
    const prevMilestoneCount = useRef(milestones.length);
    const prevCommentaryCount = useRef(commentary.length);
    const prevStatus = useRef(matchState?.status);

    useEffect(() => {
        // Handle Requesting permissions once.
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            prevMilestoneCount.current = milestones.length;
            prevCommentaryCount.current = commentary.length;
            prevStatus.current = matchState?.status;

            if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }
            return;
        }

        // If we are time-traveling, NO notifications!
        if (replayIndex !== null) {
            prevMilestoneCount.current = milestones.length;
            prevCommentaryCount.current = commentary.length;
            prevStatus.current = matchState?.status;
            return;
        }

        const currentMilestoneCount = milestones.length;
        const currentCommentaryCount = commentary.length;
        const currentStatus = matchState?.status;

        const messagesToNotify: string[] = [];

        // 1. Detect Wickets from Commentary
        // deriveCommentary returns REVERSE chronological, so newest are at the start [0].
        if (currentCommentaryCount > prevCommentaryCount.current) {
            const diff = currentCommentaryCount - prevCommentaryCount.current;
            for (let i = diff - 1; i >= 0; i--) {
                const entry = commentary[i];
                if (entry && entry.text.startsWith("WICKET!")) {
                    // "WICKET! bowler gets batter. text."
                    // Let's just output the exact text or extract a cleaner version.
                    // Based on generateCommentaryLine: "WICKET! bowler gets outPlayer. text" or "WICKET! outPlayer is out (TYPE)."
                    const summary = entry.text.split(".")[0]; // Just the first sentence is punchy!
                    messagesToNotify.push(summary);
                }
            }
        }

        // 2. Detect Milestones
        if (currentMilestoneCount > prevMilestoneCount.current) {
            // deriveMilestones returns CHRONOLOGICAL, so newest are at the end.
            for (let i = prevMilestoneCount.current; i < currentMilestoneCount; i++) {
                const m = milestones[i];
                const msg = convertMilestoneToMessage(m);
                if (msg) messagesToNotify.push(msg);
            }
        }

        // 3. Detect Match Status Change
        if (currentStatus === "COMPLETED" && prevStatus.current !== "COMPLETED") {
            const result = derivedState?.matchResult;
            if (result) {
                // Determine winner text
                let resText = "Match Finished";
                if (result.resultType === "TIE") resText = "Match Tied!";
                else if (result.resultType === "NO_RESULT") resText = "No Result";
                else if (result.resultType === "WIN") {
                    resText = result.description || "Match Won!";
                }
                messagesToNotify.push(`Match Finished — ${resText}`);
            } else {
                messagesToNotify.push("Match Finished");
            }
        }

        // Update refs
        prevCommentaryCount.current = currentCommentaryCount;
        prevMilestoneCount.current = currentMilestoneCount;
        prevStatus.current = currentStatus;

        // Emit notifications
        for (const msg of messagesToNotify) {
            onNotify(msg);
            if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
                new Notification("CricScore Live", { body: msg });
            }
        }

    }, [milestones, commentary, matchState, derivedState, onNotify]);
}

function convertMilestoneToMessage(m: Milestone): string | null {
    const player = m.playerId || "Player";
    switch (m.type) {
        case "BATTER_50": return `🎉 Fifty for ${player}!`;
        case "BATTER_100": return `💯 Century for ${player}!`;
        case "BATTER_150": return `🔥 150 Runs for ${player}!`;
        case "BOWLER_3W": return `🎯 3 Wickets for ${player}!`;
        case "BOWLER_5W": return `🎯 5-Wicket Haul for ${player}!`;
        case "HATTRICK": return `🔥 Hat-trick by ${player}!`;
        case "PARTNERSHIP_50": return `🤝 50 Partnership!`;
        case "PARTNERSHIP_100": return `🤝 100 Partnership!`;
        case "TEAM_100": return `📈 Team crosses 100!`;
        case "TEAM_200": return `📈 Team crosses 200!`;
        case "TEAM_300": return `📈 Team crosses 300!`;
        default: return null;
    }
}
