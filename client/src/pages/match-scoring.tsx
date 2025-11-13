import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        setSelectionStep('non-strike-batsman');
        break;
      case 'non-strike-batsman':
        if (player.name !== selectedStrikeBatsman?.name) {
          setSelectedNonStrikeBatsman(player);
          setSelectionStep('bowler');
        }
        break;
      case 'bowler':
        setSelectedBowler(player);
        setSelectionStep('complete');
        break;
    }
  };

  const handleBack = () => {
    switch (selectionStep) {
      case 'non-strike-batsman':
        setSelectionStep('strike-batsman');
        setSelectedNonStrikeBatsman(null);
        break;
      case 'bowler':
        setSelectionStep('non-strike-batsman');
        setSelectedBowler(null);
        break;
      case 'complete':
        setSelectionStep('bowler');
        break;
    }
  };

  const canGoBack = () => {
    return selectionStep !== 'strike-batsman';
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
        return 'Match Setup Complete';
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

  if (selectionStep === 'complete') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground" data-testid="title-match-setup-complete">
            Match Setup Complete!
          </h2>
          <p className="text-muted-foreground mt-2">
            All players have been selected. Ready to start scoring.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
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
                  // Store selected players for scoreboard
                  const selectedPlayers = {
                    strikeBatsman: selectedStrikeBatsman,
                    nonStrikeBatsman: selectedNonStrikeBatsman,
                    bowler: selectedBowler
                  };
                  localStorage.setItem('selectedPlayers', JSON.stringify(selectedPlayers));
                  setLocation('/scoreboard');
                }}
                data-testid="button-begin-scoring"
              >
                Begin Scoring
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground" data-testid="title-player-selection">
          {getStepTitle()}
        </h2>
        <p className="text-muted-foreground mt-2">
          {getStepDescription()}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center space-x-2 mb-6">
        <div className={`w-3 h-3 rounded-full ${selectionStep === 'strike-batsman' ? 'bg-primary' : 'bg-muted'}`}></div>
        <div className={`w-3 h-3 rounded-full ${selectionStep === 'non-strike-batsman' ? 'bg-primary' : 'bg-muted'}`}></div>
        <div className={`w-3 h-3 rounded-full ${selectionStep === 'bowler' ? 'bg-primary' : 'bg-muted'}`}></div>
      </div>

      {/* Selected Players Summary */}
      {(selectedStrikeBatsman || selectedNonStrikeBatsman || selectedBowler) && (
        <Card className="mb-6">
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

      {/* Main Content Card */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectionStep === 'bowler' ? 'Bowling Team Players' : 'Batting Team Players'}
          </CardTitle>
        </CardHeader>
        
        {/* Scrollable Player List */}
        <CardContent className="flex flex-col p-6 h-full">
          <div className="flex-1 border rounded-md overflow-y-auto" style={{minHeight: '400px'}}>
            <div className="p-4">
              <div className="grid gap-3">
                {getPlayersToShow().map((player, index) => (
                  <Button
                    key={`${player.name}-${index}`}
                    onClick={() => handlePlayerSelect(player)}
                    disabled={isPlayerDisabled(player)}
                    variant={isPlayerSelected(player) ? "default" : "outline"}
                    className={`justify-start h-auto p-4 ${
                      isPlayerDisabled(player) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    data-testid={`button-select-player-${index}`}
                  >
                    <div className="text-left">
                      <div className="font-medium text-base">{player.name}</div>
                      {player.hasAccount && player.username && (
                        <div className="text-sm text-muted-foreground">@{player.username}</div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action Buttons Below Scroll Area */}
          <div className="pt-6">
            {canGoBack() ? (
              <Button
                onClick={handleBack}
                variant="ghost"
                data-testid="button-back-step"
                className="w-full"
              >
                ← Back
              </Button>
            ) : (
              <Button
                onClick={() => setLocation('/coin-toss')}
                variant="ghost"
                data-testid="button-back-to-toss"
                className="w-full"
              >
                ← Back to Toss
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}