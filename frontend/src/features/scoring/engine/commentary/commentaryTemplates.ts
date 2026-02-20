import type { DismissalType } from "../../../matches/types/domainTypes";

export const runTemplates: Record<number, string[]> = {
    0: ["Dot ball.", "No run.", "Defended solidly.", "Straight to the fielder.", "Well bowled, no run."],
    1: ["Single taken.", "Quick single.", "Pushed for one.", "Nudged away for a single."],
    2: ["Good running, two runs.", "Pushed into the gap, they come back for two.", "Excellent running between the wickets."],
    3: ["Great running, three taken!", "Saved a boundary, they get three."],
    4: ["FOUR! Crunched through the covers!", "Boundary! Pierced the gap perfectly.", "FOUR! One bounce over the ropes.", "Shot! Boundary for the batter."],
    6: ["SIX! That’s huge!", "Massive hit over the ropes!", "SIX! High and handsome!", "Out of the ground! Six runs."],
};

export const wicketTemplates: Partial<Record<DismissalType, string[]>> = {
    BOWLED: ["Clean bowled!", "Castled! Outstanding delivery.", "Through the gate! Bowled him."],
    CAUGHT: ["Taken! Safe hands in the deep.", "Edged and taken!", "Caught out! Great catch.", "In the air... and taken!"],
    LBW: ["Trapped in front! Plumb LBW.", "Huge appeal... and given! LBW.", "Struck on the pads, umpire raises the finger."],
    STUMPED: ["Stumped! Quick work behind the stumps.", "Out of the crease, stumped!"],
    RUN_OUT: ["Run out! Brilliant piece of fielding.", "Direct hit! They are gone.", "Mix up in the middle, run out!"],
    HIT_WICKET: ["Hit wicket! Chopped onto the stumps.", "Disaster! Trod on the stumps."],
};

export const extraTemplates = {
    WIDE: ["Wide ball.", "Way down the leg side, wide called.", "Wide given by the umpire."],
    NO_BALL: ["No ball called!", "Overstepped, no ball.", "High full toss, umpire signals no ball."],
    BYE: ["Byes taken.", "Beats the keeper, they cross for a bye."],
    LEG_BYE: ["Leg byes signaled.", "Off the pads for a leg bye."],
};
