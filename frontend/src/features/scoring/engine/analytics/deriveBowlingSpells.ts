import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface BowlingSpell {
    bowlerId: string;
    spellNumber: number;
    overs: number; // Stored as balls
    runsConceded: number;
    wickets: number;
    maidens: number;
}

export function deriveBowlingSpells(events: BallEvent[], targetInningsIndex: number = 0): BowlingSpell[] {
    const spells: BowlingSpell[] = [];
    
    let currentInnings = 0;
    let innWickets = 0;

    // Rebuild proper spell grouping
    let overNumber = 1;
    let overLegalBalls = 0;
    let overRuns = 0;
    let overWickets = 0;
    let currentBowlerId = "";

    interface OverSummary {
        overNum: number;
        bowlerId: string;
        runs: number;
        wickets: number;
        maiden: boolean;
    }

    const overs: OverSummary[] = [];

    const commitOver = () => {
        if (!currentBowlerId) return;
        overs.push({
            overNum: overNumber,
            bowlerId: currentBowlerId,
            runs: overRuns,
            wickets: overWickets,
            maiden: overRuns === 0
        });
        overNumber++;
        overLegalBalls = 0;
        overRuns = 0;
        overWickets = 0;
        currentBowlerId = "";
    };

    for (const event of events) {
        if (event.type === "WICKET") {
            innWickets++;
            if (innWickets >= 10 && currentInnings === 0) {
                if (overLegalBalls > 0) commitOver();
                currentInnings++;
                innWickets = 0;
                overNumber = 1; // Reset for next innings
            }
        }

        if (currentInnings !== targetInningsIndex) continue;
        if (event.type === "PHASE_CHANGE" || event.type === "INTERRUPTION") continue;

        const bowlerId = event.bowlerId;
        if (!bowlerId) continue;

        if (currentBowlerId && currentBowlerId !== bowlerId && overLegalBalls > 0) {
            // Bowler changed mid-over? We just attribute runs thus far to old bowler's over.
            // Or we treat it as the same over. For spell tracking, say the old bowler bowled a partial over.
            commitOver(); 
        }

        currentBowlerId = bowlerId;

        let ballRuns = 0;
        if (event.type === "RUN") ballRuns += event.runs;
        else if (event.type === "EXTRA") {
             if (event.extraType === "WIDE" || event.extraType === "NO_BALL") {
                 ballRuns += 1 + (event.additionalRuns || 0) + (event.extraType === "NO_BALL" ? (event.runsOffBat || 0) : 0);
             }
        }
        overRuns += ballRuns;

        if (event.type === "WICKET") {
            const credited = ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"].includes(event.dismissalType || "");
            if (credited) overWickets++;
        }

        if (isLegalDelivery(event)) {
            overLegalBalls++;
            if (overLegalBalls === 6) {
                commitOver();
            }
        }
    }

    if (overLegalBalls > 0) {
        commitOver(); // Final partial over
    }

    // Now group overs into spells.
    // A spell is continuous if the bowler bowls over N and N+2 (alternating).
    const activeSpells = new Map<string, BowlingSpell & { lastOverNum: number }>();

    for (const over of overs) {
        let spell = activeSpells.get(over.bowlerId);

        if (!spell || (over.overNum - spell.lastOverNum > 2)) {
            // Start a new spell
            const previousSpellsForBowler = spells.filter(s => s.bowlerId === over.bowlerId).length;
            spell = {
                bowlerId: over.bowlerId,
                spellNumber: previousSpellsForBowler + 1,
                overs: 0,
                runsConceded: 0,
                wickets: 0,
                maidens: 0,
                lastOverNum: over.overNum
            };
            activeSpells.set(over.bowlerId, spell);
            spells.push(spell); // Reference is maintained
        }

        // Update active spell
        spell.overs += 1;
        spell.runsConceded += over.runs;
        spell.wickets += over.wickets;
        if (over.maiden) spell.maidens++;
        spell.lastOverNum = over.overNum;
    }

    return spells.map(s => ({
        bowlerId: s.bowlerId,
        spellNumber: s.spellNumber,
        overs: s.overs,
        runsConceded: s.runsConceded,
        wickets: s.wickets,
        maidens: s.maidens
    }));
}
