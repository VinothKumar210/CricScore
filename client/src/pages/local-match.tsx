import { useState, useEffect, useCallback } from "react";
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
import { Users, AlertTriangle, Clock, Check, X, Loader2, ArrowLeft, Search, Crown, Bell, Plus, UserPlus } from "lucide-react";
import { type LocalPlayer, type Team, type User } from "@shared/schema";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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

  // Selection mode - true for team selection, false for manual entry
  const [useTeamSelection, setUseTeamSelection] = useState(true);
  const [showMyTeamDropdown, setShowMyTeamDropdown] = useState(false);
  const [showOpponentTeamDropdown, setShowOpponentTeamDropdown] = useState(false);
  
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

  // Fetch team members when teams are selected
  const { data: myTeamMembersData } = useQuery<User[]>({
    queryKey: ["/api/teams", selectedMyTeam, "members"],
    enabled: !!selectedMyTeam,
  });

  const { data: opponentTeamMembersData } = useQuery<User[]>({
    queryKey: ["/api/teams", selectedOpponentTeam, "members"],
    enabled: !!selectedOpponentTeam,
  });

  // Username validation mutation
  const validateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch(`/api/users/lookup-username?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error('Failed to validate username');
      }
      return response.json();
    },
  });

  // Spectator username validation
  const validateSpectatorMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch(`/api/users/lookup-username?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error('Failed to validate username');
      }
      return response.json();
    },
  });

  // Handle team selection
  const handleMyTeamSelect = useCallback((teamId: string, teamName: string) => {
    setSelectedMyTeam(teamId);
    setMyTeamName(teamName);
    setShowMyTeamDropdown(false);
  }, []);

  const handleOpponentTeamSelect = useCallback((teamId: string, teamName: string) => {
    setSelectedOpponentTeam(teamId);
    setOpponentTeamName(teamName);
    setShowOpponentTeamDropdown(false);
  }, []);

  // Handle opponent team search
  const handleOpponentTeamSearch = useCallback((query: string) => {
    setOpponentTeamSearch(query);
    if (query.length > 2) {
      setIsSearching(true);
      searchTeamsMutation.mutate(query);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchTeamsMutation]);

  // Handle player username validation
  const validatePlayerUsername = useCallback(async (username: string, teamType: 'my' | 'opponent', index: number) => {
    if (!username.trim()) {
      // Clear validation for empty username
      setUsernameValidation(prev => ({
        ...prev,
        [`${teamType}-${index}`]: {
          isValidating: false,
          isValid: null,
          lastValidatedUsername: ''
        }
      }));
      return;
    }

    // Avoid redundant API calls
    const validationKey = `${teamType}-${index}`;
    const lastValidated = usernameValidation[validationKey]?.lastValidatedUsername;
    if (lastValidated === username) return;

    setUsernameValidation(prev => ({
      ...prev,
      [validationKey]: {
        isValidating: true,
        isValid: null,
        lastValidatedUsername: username
      }
    }));

    try {
      const result = await validateUsernameMutation.mutateAsync(username);
      
      setUsernameValidation(prev => ({
        ...prev,
        [validationKey]: {
          isValidating: false,
          isValid: result.found,
          userId: result.found ? result.user.id : undefined,
          lastValidatedUsername: username
        }
      }));

      // Update player data with account info
      if (teamType === 'my') {
        setMyTeamPlayers(prev => prev.map((player, i) => 
          i === index ? {
            ...player,
            hasAccount: result.found,
            username: result.found ? username : undefined,
            userId: result.found ? result.user.id : undefined
          } : player
        ));
      } else {
        setOpponentTeamPlayers(prev => prev.map((player, i) => 
          i === index ? {
            ...player,
            hasAccount: result.found,
            username: result.found ? username : undefined,
            userId: result.found ? result.user.id : undefined
          } : player
        ));
      }
    } catch (error) {
      setUsernameValidation(prev => ({
        ...prev,
        [validationKey]: {
          isValidating: false,
          isValid: false,
          lastValidatedUsername: username
        }
      }));
    }
  }, [usernameValidation, validateUsernameMutation]);

  // Handle spectator username addition
  const handleAddSpectator = useCallback(async () => {
    if (!spectatorInput.trim()) return;

    setValidatingSpectatorUsername(spectatorInput);
    
    try {
      const result = await validateSpectatorMutation.mutateAsync(spectatorInput);
      
      if (result.found) {
        if (!spectatorUsernames.includes(spectatorInput)) {
          setSpectatorUsernames(prev => [...prev, spectatorInput]);
          setSpectatorUsernameValidation(prev => ({
            ...prev,
            [spectatorInput]: {
              isValid: true,
              userId: result.user.id,
              profileName: result.user.profileName
            }
          }));
        }
        setSpectatorInput('');
      } else {
        toast({
          title: "Username not found",
          description: "No user found with this username",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate username",
        variant: "destructive"
      });
    } finally {
      setValidatingSpectatorUsername(null);
    }
  }, [spectatorInput, spectatorUsernames, validateSpectatorMutation, toast]);

  // Remove spectator
  const removeSpectator = useCallback((username: string) => {
    setSpectatorUsernames(prev => prev.filter(u => u !== username));
    setSpectatorUsernameValidation(prev => {
      const newValidation = { ...prev };
      delete newValidation[username];
      return newValidation;
    });
  }, []);

  // Handle match start
  const handleStartMatch = useCallback(() => {
    // Validate that both teams have players
    const myPlayersWithNames = myTeamPlayers.filter(p => p.name.trim() !== '');
    const opponentPlayersWithNames = opponentTeamPlayers.filter(p => p.name.trim() !== '');
    
    if (myPlayersWithNames.length === 0 || opponentPlayersWithNames.length === 0) {
      toast({
        title: "Teams Required",
        description: "Both teams must have at least one player",
        variant: "destructive"
      });
      return;
    }

    if (myPlayersWithNames.length !== opponentPlayersWithNames.length) {
      toast({
        title: "Team Size Mismatch",
        description: "Both teams must have the same number of players",
        variant: "destructive"
      });
      return;
    }

    // Store match data in localStorage
    localStorage.setItem('myTeamPlayers', JSON.stringify(myPlayersWithNames));
    localStorage.setItem('opponentTeamPlayers', JSON.stringify(opponentPlayersWithNames));
    localStorage.setItem('myTeamName', myTeamName);
    localStorage.setItem('opponentTeamName', opponentTeamName);
    localStorage.setItem('matchOvers', overs === "custom" ? customOvers : overs);
    localStorage.setItem('spectatorUsernames', JSON.stringify(spectatorUsernames));
    
    setLocation('/coin-toss');
  }, [myTeamPlayers, opponentTeamPlayers, myTeamName, opponentTeamName, overs, customOvers, spectatorUsernames, toast, setLocation]);

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
      
      {/* Spectator Toggle */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5 text-blue-600" />
            Spectator Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
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

          {allowSpectators && (
            <div className="space-y-4">
              {/* Dynamic spectator display based on team selection */}
              {(selectedMyTeam || selectedOpponentTeam) && (
                <div className="space-y-3">
                  {selectedMyTeam && myTeamMembersData && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <h4 className="font-medium text-green-700 dark:text-green-300 mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {myTeamName} Members
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {myTeamMembersData.map((member) => (
                          <Badge key={member.id} variant="outline" className="bg-white dark:bg-gray-800">
                            <Avatar className="h-4 w-4 mr-1">
                              <AvatarFallback className="text-xs">
                                {member.profileName?.charAt(0) || member.username?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {member.profileName || member.username}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedOpponentTeam && opponentTeamMembersData && (
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <h4 className="font-medium text-red-700 dark:text-red-300 mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {opponentTeamName} Members
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {opponentTeamMembersData.map((member) => (
                          <Badge key={member.id} variant="outline" className="bg-white dark:bg-gray-800">
                            <Avatar className="h-4 w-4 mr-1">
                              <AvatarFallback className="text-xs">
                                {member.profileName?.charAt(0) || member.username?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {member.profileName || member.username}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual spectator addition (always available when spectators enabled) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add Spectators by Username</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter username to add as spectator"
                    value={spectatorInput}
                    onChange={(e) => setSpectatorInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSpectator()}
                    data-testid="input-spectator-username"
                  />
                  <Button
                    onClick={handleAddSpectator}
                    disabled={!spectatorInput.trim() || validatingSpectatorUsername === spectatorInput}
                    size="sm"
                    data-testid="button-add-spectator"
                  >
                    {validatingSpectatorUsername === spectatorInput ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Added spectators list */}
              {spectatorUsernames.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Added Spectators</Label>
                  <div className="flex flex-wrap gap-2">
                    {spectatorUsernames.map((username) => {
                      const validation = spectatorUsernameValidation[username];
                      return (
                        <Badge key={username} variant="secondary" className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-xs">
                              {validation?.profileName?.charAt(0) || username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {validation?.profileName || username}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeSpectator(username)}
                            data-testid={`button-remove-spectator-${username}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* My Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              My Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Team Selection */}
            <div className="relative">
              <Input
                placeholder="Select from your teams"
                value={myTeamName}
                onChange={(e) => {
                  setMyTeamName(e.target.value);
                  setShowMyTeamDropdown(e.target.value.length > 0);
                }}
                onFocus={() => setShowMyTeamDropdown(true)}
                data-testid="input-my-team-name"
                className="font-medium"
              />
              {showMyTeamDropdown && userTeams && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                  {userTeams
                    .filter(team => team.name.toLowerCase().includes(myTeamName.toLowerCase()))
                    .map((team) => (
                      <div
                        key={team.id}
                        className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        onClick={() => handleMyTeamSelect(team.id, team.name)}
                        data-testid={`option-my-team-${team.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{team.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Captain: {team.captain.profileName || team.captain.username}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            {team.viceCaptain && (
                              <Badge variant="outline" className="text-xs">
                                VC: {team.viceCaptain.profileName || team.viceCaptain.username}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                  ))}
                  {userTeams.filter(team => team.name.toLowerCase().includes(myTeamName.toLowerCase())).length === 0 && (
                    <div className="p-3 text-center text-muted-foreground">
                      No teams found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Manual Player Entry */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Playing 11</Label>
              {myTeamPlayers.map((player, index) => (
                <div key={index} className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={`Player ${index + 1} Name`}
                    value={player.name}
                    onChange={(e) => {
                      const newPlayers = [...myTeamPlayers];
                      newPlayers[index] = { ...newPlayers[index], name: e.target.value };
                      setMyTeamPlayers(newPlayers);
                    }}
                    data-testid={`input-my-player-${index}-name`}
                  />
                  <div className="relative">
                    <Input
                      placeholder="Username (optional)"
                      value={player.username || ''}
                      onChange={(e) => {
                        const newPlayers = [...myTeamPlayers];
                        newPlayers[index] = { ...newPlayers[index], username: e.target.value };
                        setMyTeamPlayers(newPlayers);
                      }}
                      onBlur={() => {
                        if (player.username) {
                          validatePlayerUsername(player.username, 'my', index);
                        }
                      }}
                      data-testid={`input-my-player-${index}-username`}
                      className={`pr-8 ${
                        usernameValidation[`my-${index}`]?.isValid === true ? 'border-green-500' :
                        usernameValidation[`my-${index}`]?.isValid === false ? 'border-red-500' : ''
                      }`}
                    />
                    {usernameValidation[`my-${index}`]?.isValidating && (
                      <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                    {usernameValidation[`my-${index}`]?.isValid === true && (
                      <Check className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                    {usernameValidation[`my-${index}`]?.isValid === false && (
                      <X className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
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
          <CardContent className="space-y-4">
            {/* Team Search */}
            <div className="relative">
              <Input
                placeholder="Search for opponent team..."
                value={opponentTeamSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setOpponentTeamSearch(value);
                  setShowOpponentTeamDropdown(value.length > 0);
                  handleOpponentTeamSearch(value);
                }}
                onFocus={() => setShowOpponentTeamDropdown(opponentTeamSearch.length > 0)}
                data-testid="input-opponent-team-search"
                className="font-medium"
              />
              {showOpponentTeamDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                  {isSearching ? (
                    <div className="p-3 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((team) => (
                      <div
                        key={team.id}
                        className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        onClick={() => handleOpponentTeamSelect(team.id, team.name)}
                        data-testid={`option-opponent-team-${team.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{team.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Captain: {team.captain.profileName || team.captain.username}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            {team.viceCaptain && (
                              <Badge variant="outline" className="text-xs">
                                VC: {team.viceCaptain.profileName || team.viceCaptain.username}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : opponentTeamSearch.length > 2 ? (
                    <div className="p-3 text-center text-muted-foreground">
                      No teams found
                    </div>
                  ) : (
                    <div className="p-3 text-center text-muted-foreground text-xs">
                      Type at least 3 characters to search
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Show selected team name */}
            {opponentTeamName && (
              <div className="p-2 bg-muted rounded-md">
                <p className="text-sm font-medium">{opponentTeamName}</p>
              </div>
            )}

            {/* Manual Player Entry */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Playing 11</Label>
              {opponentTeamPlayers.map((player, index) => (
                <div key={index} className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={`Player ${index + 1} Name`}
                    value={player.name}
                    onChange={(e) => {
                      const newPlayers = [...opponentTeamPlayers];
                      newPlayers[index] = { ...newPlayers[index], name: e.target.value };
                      setOpponentTeamPlayers(newPlayers);
                    }}
                    data-testid={`input-opponent-player-${index}-name`}
                  />
                  <div className="relative">
                    <Input
                      placeholder="Username (optional)"
                      value={player.username || ''}
                      onChange={(e) => {
                        const newPlayers = [...opponentTeamPlayers];
                        newPlayers[index] = { ...newPlayers[index], username: e.target.value };
                        setOpponentTeamPlayers(newPlayers);
                      }}
                      onBlur={() => {
                        if (player.username) {
                          validatePlayerUsername(player.username, 'opponent', index);
                        }
                      }}
                      data-testid={`input-opponent-player-${index}-username`}
                      className={`pr-8 ${
                        usernameValidation[`opponent-${index}`]?.isValid === true ? 'border-green-500' :
                        usernameValidation[`opponent-${index}`]?.isValid === false ? 'border-red-500' : ''
                      }`}
                    />
                    {usernameValidation[`opponent-${index}`]?.isValidating && (
                      <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                    {usernameValidation[`opponent-${index}`]?.isValid === true && (
                      <Check className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                    {usernameValidation[`opponent-${index}`]?.isValid === false && (
                      <X className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={handleStartMatch}
          data-testid="button-save-local-match"
          className="px-8"
        >
          Start Match
        </Button>
      </div>
    </div>
  );
}