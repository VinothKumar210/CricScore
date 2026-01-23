import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { ArrowLeft, Plus, Users, Calendar, Clock } from "lucide-react";
import { OversSelector } from "@/components/match/OversSelector";
import { TeamSelectSheet } from "@/components/match/TeamSelectSheet";
import { TossModal } from "@/components/match/TossModal";
import { PlayerSelectSheet } from "@/components/match/PlayerSelectSheet";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearFixturesCache } from "@/hooks/use-fixtures-cache";
import type { LocalPlayer } from "@shared/schema";

interface SelectedTeam {
  id: string;
  name: string;
  logo?: string;
  players: LocalPlayer[];
}

export default function LocalMatch() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const [teamA, setTeamA] = useState<SelectedTeam | null>(null);
  const [teamB, setTeamB] = useState<SelectedTeam | null>(null);
  const [venue, setVenue] = useState("");
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchTime, setMatchTime] = useState(
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
  const [overs, setOvers] = useState(10);
  const [fixtureId, setFixtureId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("fromFixture") === "true") {
      const savedTeamA = localStorage.getItem("fixtureTeamA");
      const savedTeamB = localStorage.getItem("fixtureTeamB");
      const savedOvers = localStorage.getItem("fixtureOvers");
      const savedFixtureId = localStorage.getItem("selectedFixtureId");
      const savedVenue = localStorage.getItem("fixtureVenue");

      if (savedTeamA && savedTeamB) {
        const tA = JSON.parse(savedTeamA);
        const tB = JSON.parse(savedTeamB);
        setTeamA({ ...tA, players: tA.players || [] });
        setTeamB({ ...tB, players: tB.players || [] });
      }
      if (savedOvers) setOvers(parseInt(savedOvers));
      if (savedFixtureId) setFixtureId(savedFixtureId);
      if (savedVenue) setVenue(savedVenue);

      localStorage.removeItem("fixtureTeamA");
      localStorage.removeItem("fixtureTeamB");
      localStorage.removeItem("fixtureOvers");
      localStorage.removeItem("selectedFixtureId");
      localStorage.removeItem("fixtureVenue");
    }
  }, [searchString]);

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
        id: p.id || p.userId || p.guestPlayerId || `p-${Math.random().toString(36).substr(2, 9)}`,
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

  const handleSaveFixture = async () => {
    if (!teamA || !teamB) {
      toast({
        title: "Select Teams",
        description: "Please select both teams to save fixture.",
        variant: "destructive",
      });
      return;
    }

    const fixtureData = {
      teamAId: teamA.id.startsWith('local-') ? null : teamA.id,
      teamAName: teamA.name,
      teamALogo: teamA.logo || null,
      teamAPlayers: teamA.players,
      teamBId: teamB.id.startsWith('local-') ? null : teamB.id,
      teamBName: teamB.name,
      teamBLogo: teamB.logo || null,
      teamBPlayers: teamB.players,
      overs,
      venue: venue.trim() || null,
    };

    try {
      const token = localStorage.getItem("auth_token");
      const url = fixtureId ? `/api/fixtures/${fixtureId}` : '/api/fixtures';
      const method = fixtureId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(fixtureData),
      });

      if (!response.ok) {
        throw new Error('Failed to save fixture');
      }

      clearFixturesCache();
      await queryClient.invalidateQueries({ queryKey: ["/api/fixtures"] });

      toast({
        title: "Fixture Saved",
        description: "Match fixture has been saved successfully.",
      });

      setLocation("/create-match");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save fixture. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTossComplete = async (tossWinner: "teamA" | "teamB", decision: "bat" | "bowl") => {
    const winnerTeam = tossWinner === "teamA" ? teamA : teamB;
    const loserTeam = tossWinner === "teamA" ? teamB : teamA;

    const battingFirst = decision === "bat" ? winnerTeam : loserTeam;
    const bowlingFirst = decision === "bat" ? loserTeam : winnerTeam;

    // Create the match in the backend if user is logged in
    let localMatchId = "";
    if (user && teamA && teamB) {
      try {
        const response = await apiRequest("POST", "/api/local-matches", {
          matchName: `${teamA.name} vs ${teamB.name}`,
          venue: venue || "Local Ground",
          matchDate: new Date(matchDate),
          overs: overs,
          myTeamName: teamA.name,
          myTeamId: teamA.id.startsWith('local-') ? undefined : teamA.id,
          opponentTeamName: teamB.name,
          opponentTeamId: teamB.id.startsWith('local-') ? undefined : teamB.id,
          myTeamPlayers: teamA.players,
          opponentTeamPlayers: teamB.players,
          allowSpectators: true
        });
        const match = await response.json();
        localMatchId = match.id;
        localStorage.setItem("localMatchId", localMatchId);
      } catch (error) {
        console.error("Failed to create match in backend:", error);
      }
    }

    localStorage.setItem("matchOvers", overs.toString());
    localStorage.setItem("cricscorer_match_config", JSON.stringify({ overs }));
    localStorage.setItem("tossCompleted", "true");
    localStorage.setItem("tossWinner", winnerTeam?.name || "");
    localStorage.setItem("tossDecision", decision);

    localStorage.removeItem("cricscorer_match_state");

    const matchData = {
      localMatchId,
      userTeamRole: battingFirst?.id === teamA?.id ? "batting" : "bowling",
      opponentTeamRole: battingFirst?.id === teamA?.id ? "bowling" : "batting",
      myTeamPlayers: teamA?.players || [],
      opponentTeamPlayers: teamB?.players || [],
    };

    localStorage.setItem("matchData", JSON.stringify(matchData));

    setLocation("/scoreboard");
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
      id: `g-${Math.random().toString(36).substr(2, 9)}`,
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

  return (
    <div className="h-[100dvh] w-full max-w-full flex flex-col bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setLocation("/create-match")}
          className="p-1.5 -ml-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Open Match</h1>
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden">
        <div className="flex justify-center gap-8 mb-4">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-gray-500">Select Team</span>
            <button
              onClick={() => handleOpenTeamSelect("A")}
              className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors"
            >
              {teamA?.logo ? (
                <img src={teamA.logo} alt={teamA.name} className="w-full h-full object-cover" />
              ) : teamA ? (
                <Users className="h-6 w-6 text-gray-400" />
              ) : (
                <Plus className="h-6 w-6 text-gray-400" />
              )}
            </button>
            <span className="text-xs font-semibold text-gray-900 max-w-[70px] text-center truncate">
              {teamA?.name || "TEAM A"}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-gray-500">Select Team</span>
            <button
              onClick={() => handleOpenTeamSelect("B")}
              className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors"
            >
              {teamB?.logo ? (
                <img src={teamB.logo} alt={teamB.name} className="w-full h-full object-cover" />
              ) : teamB ? (
                <Users className="h-6 w-6 text-gray-400" />
              ) : (
                <Plus className="h-6 w-6 text-gray-400" />
              )}
            </button>
            <span className="text-xs font-semibold text-gray-900 max-w-[70px] text-center truncate">
              {teamB?.name || "TEAM B"}
            </span>
          </div>
        </div>

        <div className="space-y-3 flex-1 flex flex-col justify-center">
          <Input
            placeholder="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="text-center text-sm h-10 border-0 border-b border-gray-200 rounded-none bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:border-blue-500"
          />

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full pl-8 pr-2 py-2 text-xs bg-white text-gray-900 border-0 border-b border-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1 relative">
              <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="w-full pl-8 pr-2 py-2 text-xs bg-white text-gray-900 border-0 border-b border-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="py-3">
            <OversSelector
              overs={overs}
              onOversChange={setOvers}
            />
          </div>

          <Input
            placeholder="Select Scorer (Optional)"
            className="text-center text-sm h-10 border-0 border-b border-gray-200 rounded-none bg-white text-gray-400 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:border-blue-500"
            readOnly
          />
        </div>

        <div className="flex gap-2 pt-3 mt-auto w-full min-w-0">
          <Button
            onClick={handleSaveFixture}
            className="flex-1 min-w-0 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-10 rounded-xl text-xs font-semibold shadow-md px-2"
          >
            SAVE FIXTURE
          </Button>
          <Button
            onClick={handleStartMatch}
            className="flex-1 min-w-0 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-10 rounded-xl text-xs font-semibold shadow-md px-2"
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
        <DialogContent className="max-w-sm bg-white" aria-describedby="add-guest-player-desc">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add Guest Player</DialogTitle>
            <DialogDescription id="add-guest-player-desc" className="sr-only">
              Enter the name of a guest player to add to the team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Player Name"
              value={guestPlayerName}
              onChange={(e) => setGuestPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGuestPlayer()}
              className="bg-white text-gray-900 border-gray-200"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAddGuestPlayerOpen(false)}
                className="flex-1 border-gray-200 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddGuestPlayer}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
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
