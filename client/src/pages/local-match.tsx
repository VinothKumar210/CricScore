import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, AlertTriangle, Clock, Check, X, Loader2, ArrowLeft, Search, Crown, Bell, Plus } from "lucide-react";
import { type LocalPlayer, type Team, type User } from "@shared/schema";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function LocalMatch() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [myTeamName, setMyTeamName] = useState<string>("");
  const [opponentTeamName, setOpponentTeamName] = useState<string>("");
  const [selectedMyTeam, setSelectedMyTeam] = useState<string>("");
  const [selectedOpponentTeam, setSelectedOpponentTeam] = useState<string>("");
  const [opponentTeamSearch, setOpponentTeamSearch] = useState<string>("");
  const [searchResults, setSearchResults] = useState<(Team & { captain: User, viceCaptain?: User })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Team member selection states
  const [myTeamMembers, setMyTeamMembers] = useState<any[]>([]);
  const [opponentTeamMembers, setOpponentTeamMembers] = useState<any[]>([]);
  const [selectedMyTeamMembers, setSelectedMyTeamMembers] = useState<string[]>([]);
  const [selectedOpponentTeamMembers, setSelectedOpponentTeamMembers] = useState<string[]>([]);
  const [overs, setOvers] = useState<string>("20");
  const [customOvers, setCustomOvers] = useState<string>("");
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

  // Track last validated usernames to prevent unnecessary API calls
  const [lastValidatedUsernames, setLastValidatedUsernames] = useState<Record<string, string>>({});

  // Player selection mode toggle states
  const [useTeamSelection, setUseTeamSelection] = useState(true); // true = team selection, false = username search
  
  // Spectator notification system states
  const [allowSpectators, setAllowSpectators] = useState(false);
  const [spectatorInput, setSpectatorInput] = useState("");
  const [spectatorUsernames, setSpectatorUsernames] = useState<string[]>([]);
  const [validatingSpectatorUsername, setValidatingSpectatorUsername] = useState<string | null>(null);
  const [spectatorUsernameValidation, setSpectatorUsernameValidation] = useState<Record<string, {
    isValid: boolean;
    userId?: string;
    profileName?: string;
  }>>({});

  // Username validation states
  const [usernameValidation, setUsernameValidation] = useState<Record<string, {
    isValidating: boolean;
    isValid: boolean | null;
    userId?: string;
    lastValidatedUsername?: string;
  }>>({});

  // Fetch user's teams for "My Team" dropdown
  const { data: userTeams, isLoading: userTeamsLoading } = useQuery<(Team & { captain: User, viceCaptain?: User })[]>({
    queryKey: ["/api/teams"],
  });

  // Search teams mutation for opponent team search
  const searchTeamsMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/teams/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to search teams');
      }
      return response.json();
    },
    onSuccess: (results: (Team & { captain: User, viceCaptain?: User })[]) => {
      setSearchResults(results);
      setIsSearching(false);
    },
    onError: () => {
      setSearchResults([]);
      setIsSearching(false);
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="mr-4"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold text-foreground" data-testid="title-local-match">
            Create Match
          </h2>
        </div>
        <p className="text-muted-foreground mt-2">
          Add players for each team and configure match details. Both teams must have equal number of players.
        </p>
      </div>
      
      {/* Player Selection Mode Toggle */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-blue-600" />
            Player Selection Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={useTeamSelection}
                  onCheckedChange={setUseTeamSelection}
                  data-testid="toggle-selection-mode"
                />
                <Label className="text-sm font-medium">
                  {useTeamSelection ? "Select from Teams" : "Search by Username"}
                </Label>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {useTeamSelection 
                ? "Choose players from existing teams" 
                : "Search and add players by their username"
              }
            </div>
          </div>
          
          {/* Spectator Toggle */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                checked={allowSpectators}
                onCheckedChange={setAllowSpectators}
                data-testid="toggle-spectators"
              />
              <Label className="text-sm font-medium">Allow Spectators</Label>
              <span className="text-xs text-muted-foreground">
                - Players can watch and receive match notifications
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-600" />
            Match Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Match Format</label>
                <Select value={overs} onValueChange={setOvers}>
                  <SelectTrigger data-testid="select-overs">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 Overs</SelectItem>
                    <SelectItem value="12">12 Overs</SelectItem>
                    <SelectItem value="15">15 Overs</SelectItem>
                    <SelectItem value="20">20 Overs</SelectItem>
                    <SelectItem value="custom">Custom Format</SelectItem>
                  </SelectContent>
                </Select>
                {overs === "custom" && (
                  <Input
                    type="text"
                    placeholder="Enter number of overs (1-50)"
                    value={customOvers}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setCustomOvers(value);
                      }
                    }}
                    data-testid="input-custom-overs"
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Configuration</label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-semibold">
                    {overs === "custom" && customOvers ? `${customOvers} Overs Match` : `${overs} Overs Match`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No bowling restrictions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Section */}
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
            {useTeamSelection ? (
              <div className="mb-4">
                <Input
                  placeholder="Select from your teams (Team selection mode)"
                  value={myTeamName}
                  onChange={(e) => setMyTeamName(e.target.value)}
                  data-testid="input-my-team-name"
                  className="font-medium"
                />
              </div>
            ) : (
              <div className="mb-4">
                <Input
                  placeholder="Enter team name"
                  value={myTeamName}
                  onChange={(e) => setMyTeamName(e.target.value)}
                  data-testid="input-my-team-name-search"
                  className="font-medium"
                />
              </div>
            )}
            
            <div className="text-sm text-muted-foreground mb-4">
              Current mode: {useTeamSelection ? "Team Selection" : "Username Search"}
            </div>
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
            {useTeamSelection ? (
              <div className="mb-4">
                <Input
                  placeholder="Search for opponent team..."
                  value={opponentTeamName}
                  onChange={(e) => setOpponentTeamName(e.target.value)}
                  data-testid="input-opponent-team-search"
                  className="font-medium"
                />
              </div>
            ) : (
              <div className="mb-4">
                <Input
                  placeholder="Enter opponent team name"
                  value={opponentTeamName}
                  onChange={(e) => setOpponentTeamName(e.target.value)}
                  data-testid="input-opponent-team-name-search"
                  className="font-medium"
                />
              </div>
            )}
            
            <div className="text-sm text-muted-foreground mb-4">
              Current mode: {useTeamSelection ? "Team Selection" : "Username Search"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-center">
        <Button 
          onClick={() => setLocation('/coin-toss')}
          data-testid="button-save-local-match"
          className="px-8"
        >
          Start Match
        </Button>
      </div>
    </div>
  );
}