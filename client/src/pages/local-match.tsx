import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { ArrowLeft, Plus, Users, Calendar, Clock } from "lucide-react";
import { OversSelector } from "@/components/match/OversSelector";
import { TeamSelectSheet } from "@/components/match/TeamSelectSheet";
import { TossModal } from "@/components/match/TossModal";
import { PlayerSelectSheet } from "@/components/match/PlayerSelectSheet";
import { cn } from "@/lib/utils";
import type { LocalPlayer } from "@shared/schema";

interface SelectedTeam {
  id: string;
  name: string;
  logo?: string;
  players: LocalPlayer[];
}

export default function LocalMatch() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [teamA, setTeamA] = useState<SelectedTeam | null>(null);
  const [teamB, setTeamB] = useState<SelectedTeam | null>(null);
  const [venue, setVenue] = useState("");
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchTime, setMatchTime] = useState(
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
  const [overs, setOvers] = useState(10);
  const [ballType, setBallType] = useState("Tennis Ball");

  const [teamSelectOpen, setTeamSelectOpen] = useState(false);
  const [selectingTeam, setSelectingTeam] = useState<"A" | "B">("A");
  const [tossModalOpen, setTossModalOpen] = useState(false);
  const [playerSelectOpen, setPlayerSelectOpen] = useState(false);
  const [playerSelectType, setPlayerSelectType] = useState<"batsman" | "bowler">("batsman");
  const [selectingForTeam, setSelectingForTeam] = useState<"A" | "B">("A");
  const [addGuestPlayerOpen, setAddGuestPlayerOpen] = useState(false);
  const [guestPlayerName, setGuestPlayerName] = useState("");

  const handleOpenTeamSelect = (team: "A" | "B") => {
    setSelectingTeam(team);
    setTeamSelectOpen(true);
  };

  const handleTeamSelect = (team: { id: string; name: string; logo?: string; players?: any[] }) => {
    const teamSide = selectingTeam === "A" ? "my" : "opponent";
    
    const selectedTeam: SelectedTeam = {
      id: team.id,
      name: team.name,
      logo: team.logo,
      players: team.players?.map((p: any) => ({
        name: p.name || p.user?.username || p.username || "Unknown",
        hasAccount: p.hasAccount ?? (!!p.user || !!p.userId),
        username: p.username || p.user?.username || "",
        userId: p.userId || p.user?.id,
        profileImage: p.profileImage || p.user?.profileImage,
        teamSide: teamSide,
        guestPlayerId: p.guestPlayerId,
      })) || [],
    };

    if (selectingTeam === "A") {
      setTeamA(selectedTeam);
      localStorage.setItem("myTeamId", team.id);
      localStorage.setItem("myTeamName", team.name);
    } else {
      setTeamB(selectedTeam);
      localStorage.setItem("opponentTeamId", team.id);
      localStorage.setItem("opponentTeamName", team.name);
    }
  };

  const handleCreateTeam = () => {
    setTeamSelectOpen(false);
    setLocation("/teams");
  };

  const handleStartMatch = () => {
    if (!teamA || !teamB) {
      toast({
        title: "Select Teams",
        description: "Please select both teams before starting the match.",
        variant: "destructive",
      });
      return;
    }

    if (teamA.players.length < 2 || teamB.players.length < 2) {
      toast({
        title: "Not Enough Players",
        description: "Each team needs at least 2 players.",
        variant: "destructive",
      });
      return;
    }

    setTossModalOpen(true);
  };

  const handleSaveFixture = () => {
    if (!teamA || !teamB) {
      toast({
        title: "Select Teams",
        description: "Please select both teams to save fixture.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Fixture Saved",
      description: "Match fixture has been saved successfully.",
    });
  };

  const handleTossComplete = (tossWinner: "teamA" | "teamB", decision: "bat" | "bowl") => {
    const winnerTeam = tossWinner === "teamA" ? teamA : teamB;
    const loserTeam = tossWinner === "teamA" ? teamB : teamA;

    const battingFirst = decision === "bat" ? winnerTeam : loserTeam;
    const bowlingFirst = decision === "bat" ? loserTeam : winnerTeam;

    localStorage.setItem("matchOvers", overs.toString());
    localStorage.setItem("tossCompleted", "true");
    localStorage.setItem("tossWinner", winnerTeam?.name || "");
    localStorage.setItem("tossDecision", decision);

    const matchData = {
      userTeamRole: battingFirst?.id === teamA?.id ? "batting" : "bowling",
      opponentTeamRole: battingFirst?.id === teamA?.id ? "bowling" : "batting",
      myTeamPlayers: teamA?.players || [],
      opponentTeamPlayers: teamB?.players || [],
    };

    localStorage.setItem("matchData", JSON.stringify(matchData));

    setLocation("/match-scoring");
  };

  const handleAddGuestPlayer = () => {
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
      username: "",
      teamSide: selectingForTeam === "A" ? "my" : "opponent",
    };

    if (selectingForTeam === "A" && teamA) {
      setTeamA({
        ...teamA,
        players: [...teamA.players, newPlayer],
      });
    } else if (selectingForTeam === "B" && teamB) {
      setTeamB({
        ...teamB,
        players: [...teamB.players, newPlayer],
      });
    }

    setGuestPlayerName("");
    setAddGuestPlayerOpen(false);
    toast({
      title: "Player Added",
      description: `${newPlayer.name} has been added as a guest player.`,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
        <button
          onClick={() => setLocation("/dashboard")}
          className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Open Match</h1>
      </div>

      <div className="flex-1 flex flex-col justify-between px-4 py-4 overflow-hidden">
        <div className="flex justify-around items-start">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-muted-foreground">Select Team</span>
            <button
              onClick={() => handleOpenTeamSelect("A")}
              className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
            >
              {teamA?.logo ? (
                <img src={teamA.logo} alt={teamA.name} className="w-full h-full object-cover" />
              ) : teamA ? (
                <Users className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Plus className="h-8 w-8 text-muted-foreground" />
              )}
            </button>
            <span className="text-sm font-semibold text-foreground max-w-[80px] text-center truncate">
              {teamA?.name || "TEAM A"}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-muted-foreground">Select Team</span>
            <button
              onClick={() => handleOpenTeamSelect("B")}
              className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
            >
              {teamB?.logo ? (
                <img src={teamB.logo} alt={teamB.name} className="w-full h-full object-cover" />
              ) : teamB ? (
                <Users className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Plus className="h-8 w-8 text-muted-foreground" />
              )}
            </button>
            <span className="text-sm font-semibold text-foreground max-w-[80px] text-center truncate">
              {teamB?.name || "TEAM B"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="text-center border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-primary"
          />

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-transparent border-0 border-b focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1 relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-transparent border-0 border-b focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="py-2">
          <OversSelector
            overs={overs}
            onOversChange={setOvers}
            ballType={ballType}
            onBallTypeChange={setBallType}
          />
        </div>

        <div>
          <Input
            placeholder="Select Scorer (Optional)"
            className="text-center border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-primary text-muted-foreground"
            readOnly
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSaveFixture}
            variant="default"
            className="flex-1 bg-[#008B8B] hover:bg-[#007777] text-white h-12"
          >
            SAVE FIXTURE
          </Button>
          <Button
            onClick={handleStartMatch}
            variant="default"
            className="flex-1 bg-[#008B8B] hover:bg-[#007777] text-white h-12"
          >
            START MATCH
          </Button>
        </div>
      </div>

      <TeamSelectSheet
        open={teamSelectOpen}
        onOpenChange={setTeamSelectOpen}
        onTeamSelect={handleTeamSelect}
        isMyTeam={selectingTeam === "A"}
        onCreateTeam={handleCreateTeam}
      />

      {teamA && teamB && (
        <TossModal
          open={tossModalOpen}
          onOpenChange={setTossModalOpen}
          teamA={{ id: teamA.id, name: teamA.name, logo: teamA.logo }}
          teamB={{ id: teamB.id, name: teamB.name, logo: teamB.logo }}
          onTossComplete={handleTossComplete}
        />
      )}

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
                className="flex-1 bg-[#008B8B] hover:bg-[#007777] text-white"
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
