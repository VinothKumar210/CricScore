import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { type LocalPlayer } from '@shared/schema';

interface MatchState {
  userTeamRole: string;
  opponentTeamRole: string;
  myTeamPlayers: LocalPlayer[];
  opponentTeamPlayers: LocalPlayer[];
  strikeBatsman: LocalPlayer;
  nonStrikeBatsman: LocalPlayer;
  currentBowler: LocalPlayer;
}

interface BatsmanStats {
  player: LocalPlayer;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

interface BowlerStats {
  player: LocalPlayer;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
}

interface TeamScore {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
}

type DismissalType = 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | 'Hit Wicket';

export default function Scoreboard() {
  const [, setLocation] = useLocation();
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [battingTeamScore, setBattingTeamScore] = useState<TeamScore>({
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }
  });
  
  const [batsmanStats, setBatsmanStats] = useState<BatsmanStats[]>([]);
  const [bowlerStats, setBowlerStats] = useState<BowlerStats[]>([]);
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showBatsmanDialog, setShowBatsmanDialog] = useState(false);
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [extrasType, setExtrasType] = useState<'nb' | 'wd' | 'lb' | null>(null);
  const [pendingWicket, setPendingWicket] = useState<DismissalType | null>(null);

  useEffect(() => {
    // Get match data from localStorage
    const savedMatchData = localStorage.getItem('matchData');
    const savedPlayers = localStorage.getItem('selectedPlayers');
    
    if (savedMatchData && savedPlayers) {
      const matchData = JSON.parse(savedMatchData);
      const players = JSON.parse(savedPlayers);
      
      const initialMatchState: MatchState = {
        ...matchData,
        strikeBatsman: players.strikeBatsman,
        nonStrikeBatsman: players.nonStrikeBatsman,
        currentBowler: players.bowler
      };
      
      setMatchState(initialMatchState);
      
      // Initialize batsman stats
      setBatsmanStats([
        {
          player: players.strikeBatsman,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0
        },
        {
          player: players.nonStrikeBatsman,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0
        }
      ]);
      
      // Initialize bowler stats
      setBowlerStats([
        {
          player: players.bowler,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          economy: 0
        }
      ]);
    } else {
      setLocation('/match-scoring');
    }
  }, [setLocation]);

  if (!matchState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userTeamBatsFirst = matchState.userTeamRole.includes('batting');
  const battingTeamPlayers = userTeamBatsFirst 
    ? matchState.myTeamPlayers.filter(p => p.name.trim() !== '')
    : matchState.opponentTeamPlayers.filter(p => p.name.trim() !== '');

  const getCurrentBatsmanStats = (isStriker: boolean) => {
    const player = isStriker ? matchState.strikeBatsman : matchState.nonStrikeBatsman;
    return batsmanStats.find(stat => stat.player.name === player.name) || {
      player,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0
    };
  };

  const getCurrentBowlerStats = () => {
    return bowlerStats.find(stat => stat.player.name === matchState.currentBowler.name) || {
      player: matchState.currentBowler,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      economy: 0
    };
  };

  const shouldRotateStrike = (runs: number) => {
    return runs === 1 || runs === 3;
  };

  const rotateStrike = () => {
    setMatchState(prev => prev ? {
      ...prev,
      strikeBatsman: prev.nonStrikeBatsman,
      nonStrikeBatsman: prev.strikeBatsman
    } : null);
  };

  const updateBatsmanStats = (player: LocalPlayer, runsScored: number, ballFaced: boolean = true) => {
    setBatsmanStats(prev => prev.map(stat => {
      if (stat.player.name === player.name) {
        const newRuns = stat.runs + runsScored;
        const newBalls = stat.balls + (ballFaced ? 1 : 0);
        const newFours = stat.fours + (runsScored === 4 ? 1 : 0);
        const newSixes = stat.sixes + (runsScored === 6 ? 1 : 0);
        const newStrikeRate = newBalls > 0 ? (newRuns / newBalls) * 100 : 0;
        
        return {
          ...stat,
          runs: newRuns,
          balls: newBalls,
          fours: newFours,
          sixes: newSixes,
          strikeRate: Math.round(newStrikeRate * 100) / 100
        };
      }
      return stat;
    }));
  };

  const updateBowlerStats = (runsGiven: number, isLegalBall: boolean = true, isWicket: boolean = false) => {
    setBowlerStats(prev => prev.map(stat => {
      if (stat.player.name === matchState.currentBowler.name) {
        const newRuns = stat.runs + runsGiven;
        const newBalls = stat.balls + (isLegalBall ? 1 : 0);
        const newWickets = stat.wickets + (isWicket ? 1 : 0);
        const newOvers = Math.floor(newBalls / 6);
        const remainingBalls = newBalls % 6;
        const oversBowled = newOvers + (remainingBalls / 10);
        const newEconomy = oversBowled > 0 ? newRuns / oversBowled : 0;
        
        return {
          ...stat,
          runs: newRuns,
          balls: newBalls,
          overs: oversBowled,
          wickets: newWickets,
          economy: Math.round(newEconomy * 100) / 100
        };
      }
      return stat;
    }));
  };

  const updateTeamScore = (runsToAdd: number, isLegalBall: boolean = true) => {
    setBattingTeamScore(prev => {
      const newRuns = prev.runs + runsToAdd;
      const newBalls = prev.balls + (isLegalBall ? 1 : 0);
      const newOvers = Math.floor(newBalls / 6);
      const remainingBalls = newBalls % 6;
      
      return {
        ...prev,
        runs: newRuns,
        balls: newBalls,
        overs: newOvers
      };
    });
  };

  const handleRunScored = (runs: number) => {
    // Update team score
    updateTeamScore(runs);
    
    // Update striker's stats
    updateBatsmanStats(matchState.strikeBatsman, runs);
    
    // Update bowler stats
    updateBowlerStats(runs);
    
    // Rotate strike if needed
    if (shouldRotateStrike(runs)) {
      rotateStrike();
    }
    
    // Check for end of over
    if ((battingTeamScore.balls + 1) % 6 === 0) {
      // End of over - auto rotate strike
      setTimeout(() => rotateStrike(), 500);
    }
  };

  const handleExtra = (type: 'nb' | 'wd' | 'lb', additionalRuns: number = 0, isLegBye: boolean = false) => {
    if (type === 'nb' && isLegBye) {
      // No Ball + Leg Bye: 1 run penalty + leg bye runs, no legal ball
      const totalRuns = 1 + additionalRuns; // 1 for no ball + leg bye runs
      updateTeamScore(totalRuns, false); // Not a legal ball
      updateBatsmanStats(matchState.strikeBatsman, 0, false); // No runs to batsman, no ball faced
      updateBowlerStats(totalRuns, false, false); // Runs given, no legal ball
      
      // Update extras
      setBattingTeamScore(prev => ({
        ...prev,
        extras: {
          ...prev.extras,
          noBalls: prev.extras.noBalls + 1,
          legByes: prev.extras.legByes + additionalRuns
        }
      }));
      
      // Rotate strike for odd leg bye runs
      if (shouldRotateStrike(additionalRuns)) {
        rotateStrike();
      }
    } else if (type === 'lb') {
      // Leg bye: runs go to team only, striker faces ball, legal delivery
      updateTeamScore(additionalRuns, true); // Legal ball
      updateBatsmanStats(matchState.strikeBatsman, 0, true); // No runs to batsman, but ball faced
      updateBowlerStats(additionalRuns, true, false); // Runs given, legal ball, no wicket
      
      // Update leg byes in extras
      setBattingTeamScore(prev => ({
        ...prev,
        extras: {
          ...prev.extras,
          legByes: prev.extras.legByes + additionalRuns
        }
      }));
      
      // Rotate strike for odd runs
      if (shouldRotateStrike(additionalRuns)) {
        rotateStrike();
      }
      
      // Check for end of over
      if ((battingTeamScore.balls + 1) % 6 === 0) {
        setTimeout(() => rotateStrike(), 500);
      }
    } else {
      const totalRuns = 1 + additionalRuns; // 1 for the extra + additional runs
      
      // Update team score (no legal ball)
      updateTeamScore(totalRuns, false);
      
      // Update extras
      setBattingTeamScore(prev => ({
        ...prev,
        extras: {
          ...prev.extras,
          noBalls: prev.extras.noBalls + (type === 'nb' ? 1 : 0),
          wides: prev.extras.wides + (type === 'wd' ? 1 : 0)
        }
      }));
      
      // For no ball with runs, update striker's stats
      if (type === 'nb' && additionalRuns > 0) {
        updateBatsmanStats(matchState.strikeBatsman, additionalRuns, false);
        
        // Rotate strike for odd additional runs
        if (shouldRotateStrike(additionalRuns)) {
          rotateStrike();
        }
      }
      
      // Update bowler stats (runs but no legal ball)
      updateBowlerStats(totalRuns, false);
    }
  };

  const handleWicket = (dismissalType: DismissalType) => {
    // Update team wickets
    setBattingTeamScore(prev => ({
      ...prev,
      wickets: prev.wickets + 1
    }));
    
    // Update bowler stats if bowler gets credit
    if (['Bowled', 'Caught', 'LBW', 'Hit Wicket'].includes(dismissalType)) {
      updateBowlerStats(0, true, true);
    } else {
      updateBowlerStats(0, true, false);
    }
    
    // Update striker's balls faced
    updateBatsmanStats(matchState.strikeBatsman, 0);
    
    // Show dialog to select new batsman
    setShowBatsmanDialog(true);
    setPendingWicket(dismissalType);
  };

  const selectNewBatsman = (newBatsman: LocalPlayer) => {
    // Add new batsman stats
    setBatsmanStats(prev => [
      ...prev,
      {
        player: newBatsman,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0
      }
    ]);
    
    // Replace the striker (assuming striker got out)
    setMatchState(prev => prev ? {
      ...prev,
      strikeBatsman: newBatsman
    } : null);
    
    setShowBatsmanDialog(false);
    setPendingWicket(null);
  };

  const availableBatsmen = battingTeamPlayers.filter(player => 
    !batsmanStats.some(stat => stat.player.name === player.name)
  );

  const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Match Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {userTeamBatsFirst ? 'Your Team' : 'Opponent Team'} Batting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {battingTeamScore.runs}/{battingTeamScore.wickets}
            </div>
            <div className="text-lg text-muted-foreground">
              Overs: {formatOvers(battingTeamScore.balls)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Ball-by-Ball Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Run Buttons */}
          <div>
            <h4 className="font-semibold mb-2">Runs Scored</h4>
            <div className="grid grid-cols-6 gap-2">
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <Button
                  key={runs}
                  onClick={() => handleRunScored(runs)}
                  variant={runs === 4 || runs === 6 ? "default" : "outline"}
                  className="h-12 text-lg font-bold"
                  data-testid={`button-runs-${runs}`}
                >
                  {runs}
                </Button>
              ))}
            </div>
          </div>

          {/* Wicket and Extras */}
          <div className="grid md:grid-cols-4 gap-4">
            <Button
              onClick={() => setShowWicketDialog(true)}
              variant="destructive"
              className="h-12"
              data-testid="button-wicket"
            >
              Wicket
            </Button>
            
            <Button
              onClick={() => {
                setExtrasType('nb');
                setShowExtrasDialog(true);
              }}
              variant="secondary"
              className="h-12"
              data-testid="button-no-ball"
            >
              No Ball (NB)
            </Button>
            
            <Button
              onClick={() => {
                setExtrasType('wd');
                setShowExtrasDialog(true);
              }}
              variant="secondary"
              className="h-12"
              data-testid="button-wide"
            >
              Wide (WD)
            </Button>
            
            <Button
              onClick={() => {
                setExtrasType('lb');
                setShowExtrasDialog(true);
              }}
              variant="secondary"
              className="h-12"
              data-testid="button-leg-bye"
            >
              Leg Bye (LB)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Players */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>On Strike</span>
              <Badge variant="default">*</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold text-lg">{matchState.strikeBatsman.name}</p>
              <div className="text-sm space-y-1">
                <p>Runs: {getCurrentBatsmanStats(true).runs}</p>
                <p>Balls: {getCurrentBatsmanStats(true).balls}</p>
                <p>Strike Rate: {getCurrentBatsmanStats(true).strikeRate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Non-Strike</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold text-lg">{matchState.nonStrikeBatsman.name}</p>
              <div className="text-sm space-y-1">
                <p>Runs: {getCurrentBatsmanStats(false).runs}</p>
                <p>Balls: {getCurrentBatsmanStats(false).balls}</p>
                <p>Strike Rate: {getCurrentBatsmanStats(false).strikeRate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bowler Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Current Bowler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-semibold text-lg">{matchState.currentBowler.name}</p>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Overs: {getCurrentBowlerStats().overs}</div>
              <div>Runs: {getCurrentBowlerStats().runs}</div>
              <div>Wickets: {getCurrentBowlerStats().wickets}</div>
              <div>Economy: {getCurrentBowlerStats().economy}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wicket Dialog */}
      <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Dismissal Type</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'] as DismissalType[]).map(type => (
              <Button
                key={type}
                onClick={() => {
                  handleWicket(type);
                  setShowWicketDialog(false);
                }}
                variant="outline"
                data-testid={`button-dismissal-${type.toLowerCase().replace(' ', '-')}`}
              >
                {type}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Batsman Dialog */}
      <Dialog open={showBatsmanDialog} onOpenChange={setShowBatsmanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select New Batsman</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-60">
            <div className="grid gap-2">
              {availableBatsmen.map((player, index) => (
                <Button
                  key={`${player.name}-${index}`}
                  onClick={() => selectNewBatsman(player)}
                  variant="outline"
                  className="justify-start"
                  data-testid={`button-new-batsman-${index}`}
                >
                  {player.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Extras Dialog */}
      <Dialog open={showExtrasDialog} onOpenChange={setShowExtrasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {extrasType === 'nb' ? 'No Ball Options' : 
               extrasType === 'wd' ? 'Wide + Additional Runs' : 
               'Leg Bye Runs'}
            </DialogTitle>
          </DialogHeader>
          {extrasType === 'nb' ? (
            <div className="space-y-4">
              {/* Regular No Ball Options */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">No Ball + Batsman Runs</h4>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    onClick={() => {
                      handleExtra('nb', 0);
                      setShowExtrasDialog(false);
                    }}
                    variant="outline"
                    data-testid="button-nb-0"
                    className="text-xs"
                  >
                    NB
                  </Button>
                  {[1, 2, 3, 4, 6].map(runs => (
                    <Button
                      key={runs}
                      onClick={() => {
                        handleExtra('nb', runs);
                        setShowExtrasDialog(false);
                      }}
                      variant="outline"
                      data-testid={`button-nb-${runs}`}
                      className="text-xs"
                    >
                      NB+{runs}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* No Ball + Leg Bye Options */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">No Ball + Leg Bye</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(runs => (
                    <Button
                      key={`lb-${runs}`}
                      onClick={() => {
                        handleExtra('nb', runs, true);
                        setShowExtrasDialog(false);
                      }}
                      variant="outline"
                      data-testid={`button-nb-lb-${runs}`}
                      className="text-xs"
                    >
                      NB+LB{runs}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {extrasType !== 'lb' && (
                <Button
                  onClick={() => {
                    handleExtra(extrasType!, 0);
                    setShowExtrasDialog(false);
                  }}
                  variant="outline"
                  data-testid={`button-${extrasType}-0`}
                >
                  {extrasType?.toUpperCase()}
                </Button>
              )}
              {(extrasType === 'lb' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 6]).map(runs => (
                <Button
                  key={runs}
                  onClick={() => {
                    handleExtra(extrasType!, runs);
                    setShowExtrasDialog(false);
                  }}
                  variant="outline"
                  data-testid={`button-${extrasType}-${runs}`}
                >
                  {extrasType === 'lb' ? `LB ${runs}` : `${extrasType?.toUpperCase()}+${runs}`}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}