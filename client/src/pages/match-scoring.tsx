import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Plus, User, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { type LocalPlayer } from '@shared/schema';
import { useGuestPlayerSync } from '@/hooks/useGuestPlayerSync';

type SelectionStep = 'strike-batsman' | 'non-strike-batsman' | 'bowler' | 'complete';

interface MatchData {
  userTeamRole: string;
  opponentTeamRole: string;
  myTeamPlayers: LocalPlayer[];
  opponentTeamPlayers: LocalPlayer[];
}

export default function MatchScoring() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { syncGuestPlayerToTeam } = useGuestPlayerSync();
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('strike-batsman');
  const [selectedStrikeBatsman, setSelectedStrikeBatsman] = useState<LocalPlayer | null>(null);
  const [selectedNonStrikeBatsman, setSelectedNonStrikeBatsman] = useState<LocalPlayer | null>(null);
  const [selectedBowler, setSelectedBowler] = useState<LocalPlayer | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addGuestPlayerOpen, setAddGuestPlayerOpen] = useState(false);
  const [guestPlayerName, setGuestPlayerName] = useState('');

  useEffect(() => {
    const savedMatchData = localStorage.getItem('matchData');
    if (savedMatchData) {
      setMatchData(JSON.parse(savedMatchData));
    } else {
      setLocation('/local-match');
    }
  }, [setLocation]);

  if (!matchData) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  const getPlayersToShow = () => {
    if (selectionStep === 'bowler') {
      return bowlingTeamPlayers;
    }
    return battingTeamPlayers;
  };

  const filteredPlayers = getPlayersToShow().filter(
    (player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.username && player.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePlayerSelect = (player: LocalPlayer) => {
    switch (selectionStep) {
      case 'strike-batsman':
        setSelectedStrikeBatsman(player);
        setSelectionStep('non-strike-batsman');
        setSearchQuery('');
        break;
      case 'non-strike-batsman':
        if (player.name !== selectedStrikeBatsman?.name) {
          setSelectedNonStrikeBatsman(player);
          setSelectionStep('bowler');
          setSearchQuery('');
        }
        break;
      case 'bowler':
        setSelectedBowler(player);
        setSelectionStep('complete');
        setSearchQuery('');
        break;
    }
  };

  const handleBack = () => {
    switch (selectionStep) {
      case 'strike-batsman':
        setLocation('/local-match');
        break;
      case 'non-strike-batsman':
        setSelectionStep('strike-batsman');
        setSelectedStrikeBatsman(null);
        break;
      case 'bowler':
        setSelectionStep('non-strike-batsman');
        setSelectedNonStrikeBatsman(null);
        break;
      case 'complete':
        setSelectionStep('bowler');
        setSelectedBowler(null);
        break;
    }
    setSearchQuery('');
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

  const getStepTitle = () => {
    switch (selectionStep) {
      case 'strike-batsman':
        return 'Select Batsman';
      case 'non-strike-batsman':
        return 'Select Batsman';
      case 'bowler':
        return 'Select Bowler';
      default:
        return 'Ready to Start';
    }
  };

  const getStepSubtitle = () => {
    switch (selectionStep) {
      case 'strike-batsman':
        return 'Opening batsman (striker)';
      case 'non-strike-batsman':
        return 'Opening batsman (non-striker)';
      case 'bowler':
        return 'Opening bowler';
      default:
        return '';
    }
  };

  const handleAddGuestPlayer = async () => {
    if (!guestPlayerName.trim()) {
      toast({
        title: "Enter Name",
        description: "Please enter the guest player's name.",
        variant: "destructive",
      });
      return;
    }

    const newPlayer: LocalPlayer = {
      name: guestPlayerName.trim(),
      hasAccount: false,
      username: '',
      teamSide: selectionStep === 'bowler' 
        ? (userTeamBatsFirst ? 'opponent' : 'my')
        : (userTeamBatsFirst ? 'my' : 'opponent'),
    };

    // Determine team ID and sync to database
    let teamId: string | null = null;
    if (selectionStep === 'bowler') {
      if (userTeamBatsFirst) {
        matchData.opponentTeamPlayers.push(newPlayer);
        teamId = localStorage.getItem('opponentTeamId');
      } else {
        matchData.myTeamPlayers.push(newPlayer);
        teamId = localStorage.getItem('myTeamId');
      }
    } else {
      if (userTeamBatsFirst) {
        matchData.myTeamPlayers.push(newPlayer);
        teamId = localStorage.getItem('myTeamId');
      } else {
        matchData.opponentTeamPlayers.push(newPlayer);
        teamId = localStorage.getItem('opponentTeamId');
      }
    }

    localStorage.setItem('matchData', JSON.stringify(matchData));
    setMatchData({ ...matchData });

    // Sync guest player to team database
    if (teamId) {
      const role = selectionStep === 'bowler' ? 'bowler' : 'batsman';
      await syncGuestPlayerToTeam(teamId, newPlayer.name, role);
    }

    setGuestPlayerName('');
    setAddGuestPlayerOpen(false);
    toast({
      title: "Player Added",
      description: `${newPlayer.name} has been added as a guest player.`,
    });
  };

  const handleBeginScoring = () => {
    const selectedPlayers = {
      strikeBatsman: selectedStrikeBatsman,
      nonStrikeBatsman: selectedNonStrikeBatsman,
      bowler: selectedBowler
    };
    localStorage.setItem('selectedPlayers', JSON.stringify(selectedPlayers));
    setLocation('/scoreboard');
  };

  if (selectionStep === 'complete') {
    return (
      <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
        <div className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3 shrink-0">
          <button onClick={handleBack} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Match Ready</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center p-6 gap-6">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-xl font-bold text-center">All Players Selected!</h2>
          
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Batting</h3>
              <p className="text-sm">Striker: <span className="font-medium">{selectedStrikeBatsman?.name}</span></p>
              <p className="text-sm">Non-striker: <span className="font-medium">{selectedNonStrikeBatsman?.name}</span></p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Bowling</h3>
              <p className="text-sm">Bowler: <span className="font-medium">{selectedBowler?.name}</span></p>
            </div>
          </div>

          <Button
            onClick={handleBeginScoring}
            className="w-full max-w-sm h-12 bg-blue-600 hover:bg-blue-700 text-white"
          >
            BEGIN SCORING
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3 shrink-0">
        <button onClick={handleBack} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{getStepTitle()}</h1>
          <p className="text-sm text-white/80">{getStepSubtitle()}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Name or Profile ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredPlayers.map((player, index) => {
            const disabled = isPlayerDisabled(player);
            const selected = isPlayerSelected(player);
            
            return (
              <button
                key={player.name + index}
                onClick={() => !disabled && handlePlayerSelect(player)}
                disabled={disabled}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  selected ? "bg-blue-100 border-2 border-blue-600" : "hover:bg-muted/50",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {index + 1}
                </span>

                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {player.profileImage ? (
                    <img
                      src={player.profileImage}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-foreground">{player.name}</p>
                  {player.username && (
                    <p className="text-xs text-muted-foreground">
                      #{player.username}
                    </p>
                  )}
                </div>

                {selected && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}

          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No players found</p>
            </div>
          )}
        </div>

        <Button
          onClick={() => setAddGuestPlayerOpen(true)}
          variant="outline"
          className="w-full mt-4 border-dashed border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          ADD / CREATE PLAYER
        </Button>
      </div>

      <Dialog open={addGuestPlayerOpen} onOpenChange={setAddGuestPlayerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Guest Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Player Name"
              value={guestPlayerName}
              onChange={(e) => setGuestPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGuestPlayer()}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAddGuestPlayerOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddGuestPlayer}
                className="flex-1 bg-blue-600 hover:bg-orange-600 text-white"
              >
                Add Player
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
