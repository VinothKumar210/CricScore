
// Pure scoring logic extracted for use in both frontend and backend

export interface BatsmanStats {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType?: string;
  bowler?: string;
  fielder?: string;
}

export interface BowlerStats {
  id: string;
  name: string;
  overs: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

export interface TeamScore {
  runs: number;
  wickets: number;
  balls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
}

export type DismissalType = 'bowled' | 'caught' | 'lbw' | 'stumped' | 'run_out' | 'hit_wicket';
export type ExtraType = 'none' | 'wide' | 'noball' | 'bye' | 'legbye';

export interface WicketEvent {
  type: DismissalType;
  dismissedBatsman: 'striker' | 'non-striker';
  dismissedAtEnd: 'striker-end' | 'non-striker-end';
  runsBeforeDismissal: number;
  fielder?: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
}

export interface MatchState {
  currentInnings: 1 | 2;
  team1Score: TeamScore;
  team2Score: TeamScore;
  team1Batting: BatsmanStats[];
  team2Batting: BatsmanStats[];
  team1Bowling: BowlerStats[];
  team2Bowling: BowlerStats[];
  strikeBatsman: PlayerInfo;
  nonStrikeBatsman: PlayerInfo;
  currentBowler: PlayerInfo;
  currentOver: string[];
  matchOvers: number;
  team1BattingFirst: boolean;
  isMatchComplete: boolean;
  result?: string;
  target?: number;
  isFreeHit: boolean;
  lastBowlerId?: string;
  ballHistory: BallEventRecord[];
}

export interface BallEventRecord {
  ballNumber: number;
  overNumber: number;
  isLegal: boolean;
  completedRuns: number;
  automaticRuns: number;
  extraType: ExtraType;
  wicket: WicketEvent | null;
  strikerBefore: PlayerInfo;
  nonStrikerBefore: PlayerInfo;
  strikerAfter: PlayerInfo;
  nonStrikerAfter: PlayerInfo;
  isFreeHit: boolean;
  bowlerId: string;
  bowlerName: string;
  displayText: string;
}

export interface BallInput {
  completedRuns: number;
  extraType: ExtraType;
  wicket: WicketEvent | null;
  isBoundary?: boolean;
}

export const formatOvers = (balls: number): string => {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
};

export function processBall(state: MatchState, params: BallInput): MatchState {
  const newState = JSON.parse(JSON.stringify(state)) as MatchState;
  const { completedRuns, extraType, wicket, isBoundary = false } = params;

  // Step 1: Determine ball legality
  const isLegal = extraType !== 'wide' && extraType !== 'noball';
  const automaticRuns = (extraType === 'wide' || extraType === 'noball') ? 1 : 0;
  const totalRuns = completedRuns + automaticRuns;

  const wasFreeHit = newState.isFreeHit;

  // Identify current team keys
  const scoreKey = newState.currentInnings === 1
    ? (newState.team1BattingFirst ? 'team1Score' : 'team2Score')
    : (newState.team1BattingFirst ? 'team2Score' : 'team1Score');

  const battingKey = newState.currentInnings === 1
    ? (newState.team1BattingFirst ? 'team1Batting' : 'team2Batting')
    : (newState.team1BattingFirst ? 'team2Batting' : 'team1Batting');

  const bowlingKey = newState.currentInnings === 1
    ? (newState.team1BattingFirst ? 'team2Bowling' : 'team1Bowling')
    : (newState.team1BattingFirst ? 'team1Bowling' : 'team2Bowling');

  const strikerBefore = { ...newState.strikeBatsman };
  const nonStrikerBefore = { ...newState.nonStrikeBatsman };

  // Step 2 & 3: Apply strike rotation from COMPLETED runs only
  if (completedRuns % 2 === 1) {
    const temp = newState.strikeBatsman;
    newState.strikeBatsman = newState.nonStrikeBatsman;
    newState.nonStrikeBatsman = temp;
  }

  // Step 4: Resolve wicket positioning
  if (wicket) {
    if (wasFreeHit && wicket.type !== 'run_out') {
      // Free hit - only run out allowed. Ignore other wickets.
    } else {
      const dismissedId = wicket.dismissedBatsman === 'striker' ? strikerBefore.id : nonStrikerBefore.id;
      const bStats = newState[battingKey].find(b => b.id === dismissedId);
      if (bStats) {
        bStats.isOut = true;
        bStats.dismissalType = wicket.type;
        bStats.bowler = newState.currentBowler.name;
        bStats.fielder = wicket.fielder;
      }

      if (wicket.type === 'run_out') {
        if (wicket.dismissedAtEnd === 'striker-end') {
          newState.strikeBatsman = { id: '', name: '' };
        } else {
          newState.nonStrikeBatsman = { id: '', name: '' };
        }
      } else {
        newState.strikeBatsman = { id: '', name: '' };
      }
      newState[scoreKey].wickets += 1;
    }
  }

  // Step 5: Increment ball count only if legal
  if (isLegal) {
    newState[scoreKey].balls += 1;
  }

  // Step 6: Check over complete
  const isOverComplete = isLegal && newState[scoreKey].balls % 6 === 0;
  if (isOverComplete && newState[scoreKey].balls < newState.matchOvers * 6) {
    const temp = newState.strikeBatsman;
    newState.strikeBatsman = newState.nonStrikeBatsman;
    newState.nonStrikeBatsman = temp;
    
    // Track last bowler and clear current bowler
    newState.lastBowlerId = newState.currentBowler.id;
    newState.currentBowler = { id: '', name: '' };
  }

  // Step 7: Free hit logic
  newState.isFreeHit = extraType === 'noball';

  // Update Score & Extras
  newState[scoreKey].runs += totalRuns;
  if (extraType === 'wide') newState[scoreKey].extras.wides += totalRuns;
  else if (extraType === 'noball') newState[scoreKey].extras.noBalls += totalRuns;
  else if (extraType === 'bye') newState[scoreKey].extras.byes += completedRuns;
  else if (extraType === 'legbye') newState[scoreKey].extras.legByes += completedRuns;

  // Update Batsman Stats (for the one who faced the ball)
  if (extraType !== 'wide' && strikerBefore.id) {
    const bStats = newState[battingKey].find(b => b.id === strikerBefore.id);
    if (bStats) {
      bStats.balls += 1;
      const bRuns = (extraType === 'bye' || extraType === 'legbye') ? 0 : completedRuns;
      bStats.runs += bRuns;
      if (isBoundary && bRuns === 4) bStats.fours += 1;
      if (isBoundary && bRuns === 6) bStats.sixes += 1;
      bStats.strikeRate = bStats.balls > 0 ? (bStats.runs / bStats.balls) * 100 : 0;
    }
  }

  // Update Bowler Stats
  const bowlerStats = newState[bowlingKey].find(b => b.id === newState.currentBowler.id);
  if (bowlerStats) {
    if (isLegal) bowlerStats.balls += 1;
    bowlerStats.overs = formatOvers(bowlerStats.balls);
    const runsConceded = (extraType === 'bye' || extraType === 'legbye') ? 0 : totalRuns;
    bowlerStats.runs += runsConceded;
    if (wicket && wicket.type !== 'run_out' && !wasFreeHit) {
      bowlerStats.wickets += 1;
    }
    bowlerStats.economy = bowlerStats.balls > 0 ? (bowlerStats.runs / (bowlerStats.balls / 6)) : 0;
    if (extraType === 'wide') bowlerStats.wides += 1;
    if (extraType === 'noball') bowlerStats.noBalls += 1;
  }

  // Record Ball Event
  let ballDisplayText = '';
  if (wicket) ballDisplayText = 'W';
  else if (extraType === 'wide') ballDisplayText = completedRuns > 0 ? `Wd+${completedRuns}` : 'Wd';
  else if (extraType === 'noball') ballDisplayText = completedRuns > 0 ? `Nb+${completedRuns}` : 'Nb';
  else if (extraType === 'bye') ballDisplayText = `B${completedRuns}`;
  else if (extraType === 'legbye') ballDisplayText = `Lb${completedRuns}`;
  else ballDisplayText = completedRuns.toString();

  const ballEvent: BallEventRecord = {
    ballNumber: (newState[scoreKey].balls - 1) % 6,
    overNumber: Math.floor((newState[scoreKey].balls - 1) / 6),
    isLegal,
    completedRuns,
    automaticRuns,
    extraType,
    wicket,
    strikerBefore,
    nonStrikerBefore,
    strikerAfter: newState.strikeBatsman,
    nonStrikerAfter: newState.nonStrikeBatsman,
    isFreeHit: wasFreeHit,
    bowlerId: newState.currentBowler.id,
    bowlerName: newState.currentBowler.name,
    displayText: ballDisplayText
  };

  newState.currentOver.push(ballDisplayText);
  if (isOverComplete) newState.currentOver = [];
  
  newState.ballHistory.push(ballEvent);

  // Check innings/match completion
  const currentTotalWickets = newState[scoreKey].wickets;
  const currentTotalBalls = newState[scoreKey].balls;
  const maxBalls = newState.matchOvers * 6;

  const isLastBallOfInnings = isLegal && currentTotalBalls >= maxBalls;
  const isAllOut = currentTotalWickets >= 10;
  
  // If target is reached in 2nd innings
  let targetReached = false;
  if (newState.currentInnings === 2 && newState.target !== undefined) {
    if (newState[scoreKey].runs >= newState.target) {
      targetReached = true;
    }
  }

  if (isLastBallOfInnings || isAllOut || targetReached) {
    if (newState.currentInnings === 1) {
      newState.currentInnings = 2;
      newState.target = newState[scoreKey].runs + 1;
      // Reset for 2nd innings (ideally handled by caller but good to have here)
    } else {
      newState.isMatchComplete = true;
      const t1Runs = newState.team1Score.runs;
      const t2Runs = newState.team2Score.runs;
      if (t1Runs > t2Runs) newState.result = "Team 1 Wins";
      else if (t2Runs > t1Runs) newState.result = "Team 2 Wins";
      else newState.result = "Match Tied";
    }
  }

  return newState;
}

export function initialMatchState(matchOvers: number = 20, team1BattingFirst: boolean = true): MatchState {
  const emptyScore = (): TeamScore => ({
    runs: 0,
    wickets: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }
  });

  return {
    currentInnings: 1,
    team1Score: emptyScore(),
    team2Score: emptyScore(),
    team1Batting: [],
    team2Batting: [],
    team1Bowling: [],
    team2Bowling: [],
    strikeBatsman: { id: '', name: '' },
    nonStrikeBatsman: { id: '', name: '' },
    currentBowler: { id: '', name: '' },
    currentOver: [],
    matchOvers,
    team1BattingFirst,
    isMatchComplete: false,
    isFreeHit: false,
    ballHistory: []
  };
}
