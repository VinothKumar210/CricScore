import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, AlertTriangle, Clock } from "lucide-react";
import { type LocalPlayer } from "@shared/schema";

export default function LocalMatch() {
  const [overs, setOvers] = useState<string>("20");
  const [myTeamPlayers, setMyTeamPlayers] = useState<LocalPlayer[]>(
    Array(11).fill(null).map((_, index) => ({
      name: "",
      hasAccount: false,
      username: undefined,
      userId: undefined,
    }))
  );
  const [opponentTeamPlayers, setOpponentTeamPlayers] = useState<LocalPlayer[]>(
    Array(11).fill(null).map((_, index) => ({
      name: "",
      hasAccount: false,
      username: undefined,
      userId: undefined,
    }))
  );

  const updateMyTeamPlayer = (index: number, field: keyof LocalPlayer, value: any) => {
    setMyTeamPlayers(prev => {
      const updatedPlayers = [...prev];
      updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
      return updatedPlayers;
    });
  };

  const updateOpponentTeamPlayer = (index: number, field: keyof LocalPlayer, value: any) => {
    setOpponentTeamPlayers(prev => {
      const updatedPlayers = [...prev];
      updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
      return updatedPlayers;
    });
  };

  // Calculate team sizes and bowling restrictions
  const myTeamSize = myTeamPlayers.filter(p => p.name.trim() !== "").length;
  const opponentTeamSize = opponentTeamPlayers.filter(p => p.name.trim() !== "").length;
  const teamsEqual = myTeamSize === opponentTeamSize;
  const bothTeamsHavePlayers = myTeamSize > 0 && opponentTeamSize > 0;

  // Bowling restrictions based on overs
  const getBowlingRestrictions = (overs: string) => {
    switch (overs) {
      case "10":
        return "Max 2 overs per bowler";
      case "12":
        return "Max 3 overs per bowler (2 bowlers only)";
      case "15":
        return "Max 3 overs per bowler";
      case "20":
        return "Max 4 overs per bowler";
      default:
        return "Standard bowling restrictions apply";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground" data-testid="title-local-match">
          Local Match - Select Playing XI
        </h2>
        <p className="text-muted-foreground mt-2">
          Add players for each team and configure match details. Both teams must have equal number of players.
        </p>
      </div>
      {/* Match Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-600" />
            Match Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Overs</label>
              <Select value={overs} onValueChange={setOvers}>
                <SelectTrigger data-testid="select-overs">
                  <SelectValue placeholder="Select overs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Overs</SelectItem>
                  <SelectItem value="12">12 Overs</SelectItem>
                  <SelectItem value="15">15 Overs</SelectItem>
                  <SelectItem value="20">20 Overs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bowling Restrictions</label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground" data-testid="bowling-restrictions">
                  {getBowlingRestrictions(overs)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Team Size Validation Alert */}
      {bothTeamsHavePlayers && !teamsEqual && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            Teams must have equal number of players. My Team: {myTeamSize} players, Opponent Team: {opponentTeamSize} players.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              My Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player Details</TableHead>
                  <TableHead className="text-center">Has Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTeamPlayers.map((player, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="space-y-2">
                        <Input
                          placeholder={`Player ${index + 1}`}
                          value={player.name}
                          onChange={(e) => updateMyTeamPlayer(index, "name", e.target.value)}
                          data-testid={`input-my-team-player-${index + 1}`}
                        />
                        {player.hasAccount && (
                          <Input
                            placeholder="@username"
                            value={player.username || ""}
                            onChange={(e) => updateMyTeamPlayer(index, "username", e.target.value)}
                            data-testid={`input-my-team-username-${index + 1}`}
                            className="text-sm"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={player.hasAccount}
                        onCheckedChange={(checked) => {
                          updateMyTeamPlayer(index, "hasAccount", checked);
                          if (!checked) {
                            updateMyTeamPlayer(index, "username", undefined);
                          }
                        }}
                        data-testid={`switch-my-team-account-${index + 1}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Opponent Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-red-600" />
              Opponent Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player Details</TableHead>
                  <TableHead className="text-center">Has Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opponentTeamPlayers.map((player, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="space-y-2">
                        <Input
                          placeholder={`Player ${index + 1}`}
                          value={player.name}
                          onChange={(e) => updateOpponentTeamPlayer(index, "name", e.target.value)}
                          data-testid={`input-opponent-team-player-${index + 1}`}
                        />
                        {player.hasAccount && (
                          <Input
                            placeholder="@username"
                            value={player.username || ""}
                            onChange={(e) => updateOpponentTeamPlayer(index, "username", e.target.value)}
                            data-testid={`input-opponent-team-username-${index + 1}`}
                            className="text-sm"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={player.hasAccount}
                        onCheckedChange={(checked) => {
                          updateOpponentTeamPlayer(index, "hasAccount", checked);
                          if (!checked) {
                            updateOpponentTeamPlayer(index, "username", undefined);
                          }
                        }}
                        data-testid={`switch-opponent-team-account-${index + 1}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 flex justify-center">
        <Button 
          onClick={() => {
            // TODO: Implement save functionality
          }}
          disabled={!bothTeamsHavePlayers || !teamsEqual}
          data-testid="button-save-local-match"
          className="px-8"
        >Start Match</Button>
      </div>
      {/* Additional Info */}
      {bothTeamsHavePlayers && teamsEqual && (
        <div className="mt-4 text-center">
          <p className="text-sm text-green-600 dark:text-green-400" data-testid="teams-ready">
            ✓ Both teams ready with {myTeamSize} players each
          </p>
        </div>
      )}
    </div>
  );
}