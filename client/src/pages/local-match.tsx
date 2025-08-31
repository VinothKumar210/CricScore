import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users, Calendar, MapPin, Plus } from "lucide-react";
import { localMatchFormSchema, type LocalMatchForm, type LocalPlayer } from "@shared/schema";

export default function LocalMatch() {
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [myTeamPlayers, setMyTeamPlayers] = useState<LocalPlayer[]>(
    Array(11).fill(null).map((_, index) => ({
      name: "",
      hasAccount: false,
      userId: undefined,
    }))
  );
  const [opponentTeamPlayers, setOpponentTeamPlayers] = useState<LocalPlayer[]>(
    Array(11).fill(null).map((_, index) => ({
      name: "",
      hasAccount: false,
      userId: undefined,
    }))
  );

  const form = useForm<LocalMatchForm>({
    resolver: zodResolver(localMatchFormSchema),
    defaultValues: {
      matchName: "",
      venue: "",
      matchDate: "",
      myTeamPlayers,
      opponentTeamPlayers,
    },
  });

  const onSubmit = (data: LocalMatchForm) => {
    console.log("Local match data:", data);
    setShowTeamSelection(true);
  };

  const updateMyTeamPlayer = (index: number, field: keyof LocalPlayer, value: any) => {
    const updatedPlayers = [...myTeamPlayers];
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
    setMyTeamPlayers(updatedPlayers);
    form.setValue("myTeamPlayers", updatedPlayers);
  };

  const updateOpponentTeamPlayer = (index: number, field: keyof LocalPlayer, value: any) => {
    const updatedPlayers = [...opponentTeamPlayers];
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
    setOpponentTeamPlayers(updatedPlayers);
    form.setValue("opponentTeamPlayers", updatedPlayers);
  };

  if (!showTeamSelection) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground" data-testid="title-local-match">
            Create Local Match
          </h2>
          <p className="text-muted-foreground mt-2">
            Create a match with players who may or may not have accounts on the platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Match Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="matchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Sunday League Match" 
                          {...field}
                          data-testid="input-match-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Local Cricket Ground" 
                          {...field}
                          data-testid="input-venue"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="matchDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-match-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  data-testid="button-create-match"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Match & Select Teams
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground" data-testid="title-team-selection">
          Select Playing XI
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
                    <TableCell className="text-center">
                      <Switch
                        checked={player.hasAccount}
                        onCheckedChange={(checked) => updateMyTeamPlayer(index, "hasAccount", checked)}
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
                    <TableCell className="text-center">
                      <Switch
                        checked={player.hasAccount}
                        onCheckedChange={(checked) => updateOpponentTeamPlayer(index, "hasAccount", checked)}
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

      <div className="mt-6 flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setShowTeamSelection(false)}
          data-testid="button-back-to-match-details"
        >
          Back to Match Details
        </Button>
        
        <Button 
          onClick={() => {
            // Here we would save the local match
            console.log("Saving local match with teams:", { myTeamPlayers, opponentTeamPlayers });
          }}
          data-testid="button-save-local-match"
        >
          Save Local Match
        </Button>
      </div>
    </div>
  );
}