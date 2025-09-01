import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type LocalPlayer } from '@shared/schema';

type SelectionStep = 'strike-batsman' | 'non-strike-batsman' | 'bowler' | 'complete';

interface MatchData {
  userTeamRole: string;
  opponentTeamRole: string;
  myTeamPlayers: LocalPlayer[];
  opponentTeamPlayers: LocalPlayer[];
}

export default function MatchScoring() {
  const [, setLocation] = useLocation();
  const [showPlayerSelection, setShowPlayerSelection] = useState(true);
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('strike-batsman');
  const [selectedStrikeBatsman, setSelectedStrikeBatsman] = useState<LocalPlayer | null>(null);
  const [selectedNonStrikeBatsman, setSelectedNonStrikeBatsman] = useState<LocalPlayer | null>(null);
  const [selectedBowler, setSelectedBowler] = useState<LocalPlayer | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);

  useEffect(() => {
    // Get match data from localStorage (passed from coin toss)
    const savedMatchData = localStorage.getItem('matchData');
    if (savedMatchData) {
      setMatchData(JSON.parse(savedMatchData));
    } else {
      // If no data, redirect back to setup
      setLocation('/local-match');
    }
  }, [setLocation]);

  if (!matchData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userTeamBatsFirst = matchData.userTeamRole.includes('batting');
  const battingTeamPlayers = userTeamBatsFirst 
    ? matchData.myTeamPlayers.filter(p => p.name.trim() !== '')
    : matchData.opponentTeamPlayers.filter(p => p.name.trim() !== '');
  
  const bowlingTeamPlayers = userTeamBatsFirst 
    ? matchData.opponentTeamPlayers.filter(p => p.name.trim() !== '')
    : matchData.myTeamPlayers.filter(p => p.name.trim() !== '');

  const handlePlayerSelect = (player: LocalPlayer) => {
    switch (selectionStep) {
      case 'strike-batsman':
        setSelectedStrikeBatsman(player);
        break;
      case 'non-strike-batsman':
        setSelectedNonStrikeBatsman(player);
        break;
      case 'bowler':
        setSelectedBowler(player);
        break;
    }
  };

  const handleNext = () => {
    switch (selectionStep) {
      case 'strike-batsman':
        if (selectedStrikeBatsman) {
          setSelectionStep('non-strike-batsman');
        }
        break;
      case 'non-strike-batsman':
        if (selectedNonStrikeBatsman) {
          setSelectionStep('bowler');
        }
        break;
      case 'bowler':
        if (selectedBowler) {
          setSelectionStep('complete');
          setShowPlayerSelection(false);
        }
        break;
    }
  };

  const canProceed = () => {
    switch (selectionStep) {
      case 'strike-batsman':
        return selectedStrikeBatsman !== null;
      case 'non-strike-batsman':
        return selectedNonStrikeBatsman !== null && selectedNonStrikeBatsman !== selectedStrikeBatsman;
      case 'bowler':
        return selectedBowler !== null;
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (selectionStep) {
      case 'strike-batsman':
        return 'Select Opening Strike Batsman';
      case 'non-strike-batsman':
        return 'Select Opening Non-Strike Batsman';
      case 'bowler':
        return 'Select Opening Bowler';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (selectionStep) {
      case 'strike-batsman':
        return 'Choose the batsman who will face the first ball';
      case 'non-strike-batsman':
        return 'Choose the batsman at the non-striker\'s end (must be different from strike batsman)';
      case 'bowler':
        return 'Choose the bowler who will bowl the first over';
      default:
        return '';
    }
  };

  const getPlayersToShow = () => {
    if (selectionStep === 'bowler') {
      return bowlingTeamPlayers;
    }
    return battingTeamPlayers;
  };

  const isPlayerDisabled = (player: LocalPlayer) => {
    if (selectionStep === 'non-strike-batsman' && selectedStrikeBatsman) {
      return player.name === selectedStrikeBatsman.name;
    }
    return false;
  };

  const isPlayerSelected = (player: LocalPlayer) => {
    switch (selectionStep) {
      case 'strike-batsman':
        return selectedStrikeBatsman?.name === player.name;
      case 'non-strike-batsman':
        return selectedNonStrikeBatsman?.name === player.name;
      case 'bowler':
        return selectedBowler?.name === player.name;
      default:
        return false;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground" data-testid="title-match-scoring">
          Match Scoring
        </h2>
        <p className="text-muted-foreground mt-2">
          {userTeamBatsFirst ? 'Your team is batting first' : 'Opponent team is batting first'}
        </p>
      </div>

      {/* Player Selection Dialog */}
      <Dialog open={showPlayerSelection} onOpenChange={setShowPlayerSelection}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {getStepTitle()}
            </DialogTitle>
            <p className="text-center text-muted-foreground">
              {getStepDescription()}
            </p>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col space-y-4">
            {/* Progress Indicator */}
            <div className="flex justify-center space-x-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${selectionStep === 'strike-batsman' ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`w-3 h-3 rounded-full ${selectionStep === 'non-strike-batsman' ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`w-3 h-3 rounded-full ${selectionStep === 'bowler' ? 'bg-primary' : 'bg-muted'}`}></div>
            </div>

            {/* Selected Players Summary */}
            {(selectedStrikeBatsman || selectedNonStrikeBatsman || selectedBowler) && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Selected Players:</h4>
                  <div className="space-y-1 text-sm">
                    {selectedStrikeBatsman && (
                      <p data-testid="selected-strike-batsman">
                        <span className="font-medium">Strike Batsman:</span> {selectedStrikeBatsman.name}
                      </p>
                    )}
                    {selectedNonStrikeBatsman && (
                      <p data-testid="selected-non-strike-batsman">
                        <span className="font-medium">Non-Strike Batsman:</span> {selectedNonStrikeBatsman.name}
                      </p>
                    )}
                    {selectedBowler && (
                      <p data-testid="selected-bowler">
                        <span className="font-medium">Opening Bowler:</span> {selectedBowler.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Player List */}
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-4">
                <h4 className="font-semibold mb-3">
                  {selectionStep === 'bowler' ? 'Bowling Team Players' : 'Batting Team Players'}
                </h4>
                <div className="grid gap-2">
                  {getPlayersToShow().map((player, index) => (
                    <Button
                      key={`${player.name}-${index}`}
                      onClick={() => handlePlayerSelect(player)}
                      disabled={isPlayerDisabled(player)}
                      variant={isPlayerSelected(player) ? "default" : "outline"}
                      className={`justify-start h-auto p-3 ${
                        isPlayerDisabled(player) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      data-testid={`button-select-player-${index}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{player.name}</div>
                        {player.hasAccount && player.username && (
                          <div className="text-sm text-muted-foreground">@{player.username}</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                onClick={() => setLocation('/coin-toss')}
                variant="ghost"
                data-testid="button-back-to-toss"
              >
                ← Back to Toss
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                data-testid="button-proceed-next"
              >
                {selectionStep === 'bowler' ? 'Start Match' : 'Next'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Setup Complete */}
      {selectionStep === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle>Match Setup Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Batting Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><span className="font-medium">Strike Batsman:</span> {selectedStrikeBatsman?.name}</p>
                    <p><span className="font-medium">Non-Strike Batsman:</span> {selectedNonStrikeBatsman?.name}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bowling Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><span className="font-medium">Opening Bowler:</span> {selectedBowler?.name}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-center space-x-4 pt-4">
              <Button
                onClick={() => {
                  setShowPlayerSelection(true);
                  setSelectionStep('strike-batsman');
                  setSelectedStrikeBatsman(null);
                  setSelectedNonStrikeBatsman(null);
                  setSelectedBowler(null);
                }}
                variant="outline"
                data-testid="button-change-players"
              >
                Change Players
              </Button>
              
              <Button
                onClick={() => {
                  // TODO: Navigate to actual scoring interface
                  console.log('Starting scoring with:', {
                    strikeBatsman: selectedStrikeBatsman,
                    nonStrikeBatsman: selectedNonStrikeBatsman,
                    bowler: selectedBowler
                  });
                }}
                data-testid="button-begin-scoring"
              >
                Begin Scoring
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}