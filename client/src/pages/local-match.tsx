import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { type LocalPlayer } from "@shared/schema";

export default function LocalMatch() {
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
    const updatedPlayers = [...myTeamPlayers];
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
    setMyTeamPlayers(updatedPlayers);
  };

  const updateOpponentTeamPlayer = (index: number, field: keyof LocalPlayer, value: any) => {
    const updatedPlayers = [...opponentTeamPlayers];
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
    setOpponentTeamPlayers(updatedPlayers);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground" data-testid="title-local-match">
          Local Match - Select Playing XI
        </h2>
        <p className="text-muted-foreground mt-2">
          Add 11 players for each team. Toggle whether each player has an account on the platform.
        </p>
      </div>

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
                  <TableHead>Player Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-center">Has Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTeamPlayers.map((player, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        placeholder={`Player ${index + 1}`}
                        value={player.name}
                        onChange={(e) => updateMyTeamPlayer(index, "name", e.target.value)}
                        data-testid={`input-my-team-player-${index + 1}`}
                      />
                    </TableCell>
                    <TableCell>
                      {player.hasAccount ? (
                        <Input
                          placeholder="@username"
                          value={player.username || ""}
                          onChange={(e) => updateMyTeamPlayer(index, "username", e.target.value)}
                          data-testid={`input-my-team-username-${index + 1}`}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">No account</span>
                      )}
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
                  <TableHead>Player Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-center">Has Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opponentTeamPlayers.map((player, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        placeholder={`Player ${index + 1}`}
                        value={player.name}
                        onChange={(e) => updateOpponentTeamPlayer(index, "name", e.target.value)}
                        data-testid={`input-opponent-team-player-${index + 1}`}
                      />
                    </TableCell>
                    <TableCell>
                      {player.hasAccount ? (
                        <Input
                          placeholder="@username"
                          value={player.username || ""}
                          onChange={(e) => updateOpponentTeamPlayer(index, "username", e.target.value)}
                          data-testid={`input-opponent-team-username-${index + 1}`}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">No account</span>
                      )}
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
            console.log("Saving local match with teams:", { myTeamPlayers, opponentTeamPlayers });
          }}
          data-testid="button-save-local-match"
          className="px-8"
        >
          Save Local Match
        </Button>
      </div>
    </div>
  );
}