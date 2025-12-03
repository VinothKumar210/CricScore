import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, AlertTriangle, Clock, Check, X, Loader2, ArrowLeft, Search, Crown } from "lucide-react";
import { type LocalPlayer, type Team, type User } from "@shared/schema";
import { useAuth } from "@/components/auth/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


export default function LocalMatch() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      teamSide: "my" as const,
    }))
  );
  const [opponentTeamPlayers, setOpponentTeamPlayers] = useState<LocalPlayer[]>(
    Array(11).fill(null).map((_, index) => ({
      name: "",
      hasAccount: false,
      username: undefined,
      userId: undefined,
      teamSide: "opponent" as const,
    }))
  );

  // Username validation states
  const [usernameValidation, setUsernameValidation] = useState<Record<string, {
    isValidating: boolean;
    isValid: boolean | null;
    userId?: string;
    lastValidatedUsername?: string;
  }>>({});

  // Track last validated usernames to prevent unnecessary API calls
  const [lastValidatedUsernames, setLastValidatedUsernames] = useState<Record<string, string>>({});
  
  // Spectator functionality states
  const [allowSpectators, setAllowSpectators] = useState<boolean>(false);
  const [selectedSpectators, setSelectedSpectators] = useState<string[]>([]);
  const [spectatorSearch, setSpectatorSearch] = useState<string>("");
  const [spectatorSearchResults, setSpectatorSearchResults] = useState<User[]>([]);
  const [isSearchingSpectators, setIsSearchingSpectators] = useState(false);
  
  // Room match states
  const [isRoomMatch, setIsRoomMatch] = useState<boolean>(false);
  const [roomPassword, setRoomPassword] = useState<string>("");

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

  // Search players mutation for spectator search
  const searchSpectatorsMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to search players');
      }
      return response.json();
    },
    onSuccess: (results: User[]) => {
      setSpectatorSearchResults(results);
      setIsSearchingSpectators(false);
    },
    onError: () => {
      setSpectatorSearchResults([]);
      setIsSearchingSpectators(false);
    },
  });

  // Create live match mutation for when spectators are enabled
  const createLiveMatchMutation = useMutation({
    mutationFn: async () => {
      // Filter out empty players
      const filteredMyTeamPlayers = myTeamPlayers.filter(p => p.name.trim() !== "");
      const filteredOpponentTeamPlayers = opponentTeamPlayers.filter(p => p.name.trim() !== "");
      
      const matchData = {
        matchName: `${myTeamName || 'My Team'} vs ${opponentTeamName || 'Opponent Team'}`,
        venue: "Local Match",
        matchDate: new Date().toISOString(),
        overs: parseInt(getCurrentOvers()),
        myTeamName: myTeamName || 'My Team',
        opponentTeamName: opponentTeamName || 'Opponent Team',
        myTeamPlayers: filteredMyTeamPlayers,
        opponentTeamPlayers: filteredOpponentTeamPlayers,
        allowSpectators: true,
        isRoomMatch,
        roomPassword: isRoomMatch ? roomPassword : undefined,
        selectedSpectators,
      };

      const response = await apiRequest('POST', '/api/local-matches', matchData);
      return response.json();
    },
    onSuccess: (match) => {
      toast({
        title: "Success",
        description: `Live match created! ${selectedSpectators.length} spectator${selectedSpectators.length !== 1 ? 's' : ''} notified.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/local-matches/spectator"] });
      queryClient.invalidateQueries({ queryKey: ["/api/local-matches/ongoing"] });
      
      // Store match data for local scoring and continue to coin toss
      localStorage.setItem('myTeamPlayers', JSON.stringify(myTeamPlayers));
      localStorage.setItem('opponentTeamPlayers', JSON.stringify(opponentTeamPlayers));
      localStorage.setItem('myTeamName', myTeamName || 'My Team');
      localStorage.setItem('opponentTeamName', opponentTeamName || 'Opponent Team');
      localStorage.setItem('matchOvers', getCurrentOvers());
      localStorage.setItem('liveMatchId', match.id); // Store for potential future sync
      setLocation('/coin-toss');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create live match",
        variant: "destructive",
      });
    },
  });

  // Debounced username validation - only when usernames actually change
  useEffect(() => {
    const validateUsernames = async () => {
      const allPlayers = [...myTeamPlayers, ...opponentTeamPlayers];
      const validationPromises: Promise<void>[] = [];

      allPlayers.forEach((player, index) => {
        const playerKey = index < 11 ? `my-${index}` : `opp-${index - 11}`;
        const currentUsername = player.username || '';
        const lastValidated = lastValidatedUsernames[playerKey] || '';
        
        if (player.hasAccount && player.username && player.username.length >= 3) {
          // Only validate if username has changed
          if (currentUsername !== lastValidated) {
            const promise = validateUsername(player.username, playerKey);
            validationPromises.push(promise);
          }
        } else if (player.hasAccount) {
          // Clear validation for empty usernames
          if (lastValidated !== '') {
            setUsernameValidation(prev => ({
              ...prev,
              [playerKey]: { isValidating: false, isValid: null }
            }));
            setLastValidatedUsernames(prev => ({
              ...prev,
              [playerKey]: ''
            }));
          }
        } else {
          // Clear validation when hasAccount is false
          if (lastValidated !== '') {
            setUsernameValidation(prev => {
              const newState = { ...prev };
              delete newState[playerKey];
              return newState;
            });
            setLastValidatedUsernames(prev => {
              const newState = { ...prev };
              delete newState[playerKey];
              return newState;
            });
          }
        }
      });

      await Promise.all(validationPromises);
    };

    const timeoutId = setTimeout(validateUsernames, 500); // Debounce for 500ms
    return () => clearTimeout(timeoutId);
  }, [myTeamPlayers, opponentTeamPlayers, lastValidatedUsernames]);

  // Debounced opponent team search
  useEffect(() => {
    if (opponentTeamSearch.trim().length >= 2) {
      setIsSearching(true);
      const timeoutId = setTimeout(() => {
        searchTeamsMutation.mutate(opponentTeamSearch);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [opponentTeamSearch]);

  // Debounced spectator search
  useEffect(() => {
    if (spectatorSearch.trim().length >= 3) {
      setIsSearchingSpectators(true);
      const timeoutId = setTimeout(() => {
        searchSpectatorsMutation.mutate(spectatorSearch);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSpectatorSearchResults([]);
      setIsSearchingSpectators(false);
    }
  }, [spectatorSearch]);

  // Fetch team members for selection
  const fetchTeamMembers = async (teamId: string, isMyTeam: boolean) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (response.ok) {
        const members = await response.json();
        if (isMyTeam) {
          setMyTeamMembers(members);
          setSelectedMyTeamMembers([]);
          // Clear playing XI table
          setMyTeamPlayers(Array(11).fill(null).map(() => ({
            name: "",
            hasAccount: false,
            username: undefined,
            userId: undefined,
          })));
        } else {
          setOpponentTeamMembers(members);
          setSelectedOpponentTeamMembers([]);
          // Clear playing XI table
          setOpponentTeamPlayers(Array(11).fill(null).map(() => ({
            name: "",
            hasAccount: false,
            username: undefined,
            userId: undefined,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  // Handle My Team selection
  const handleMyTeamSelect = async (teamId: string) => {
    try {
      setSelectedMyTeam(teamId);
      const selectedTeam = userTeams?.find(team => team.id === teamId);
      if (selectedTeam) {
        setMyTeamName(selectedTeam.name);
        await fetchTeamMembers(teamId, true);
      }
    } catch (error) {
      console.error('Error selecting team:', error);
      toast({
        title: "Error",
        description: "Failed to load team members. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle Opponent Team selection
  const handleOpponentTeamSelect = async (teamId: string) => {
    try {
      setSelectedOpponentTeam(teamId);
      const selectedTeam = searchResults.find(team => team.id === teamId);
      if (selectedTeam) {
        setOpponentTeamName(selectedTeam.name);
        setOpponentTeamSearch("");
        setSearchResults([]);
        await fetchTeamMembers(teamId, false);
      }
    } catch (error) {
      console.error('Error selecting opponent team:', error);
      toast({
        title: "Error",
        description: "Failed to load team members. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle player selection for playing XI
  const togglePlayerSelection = (playerId: string, isMyTeam: boolean) => {
    if (isMyTeam) {
      const currentSelection = selectedMyTeamMembers;
      const isSelected = currentSelection.includes(playerId);
      
      if (isSelected) {
        // Remove player from selection
        setSelectedMyTeamMembers(currentSelection.filter(id => id !== playerId));
      } else {
        // Add player to selection (max 11)
        if (currentSelection.length < 11) {
          setSelectedMyTeamMembers([...currentSelection, playerId]);
        }
      }
    } else {
      const currentSelection = selectedOpponentTeamMembers;
      const isSelected = currentSelection.includes(playerId);
      
      if (isSelected) {
        // Remove player from selection
        setSelectedOpponentTeamMembers(currentSelection.filter(id => id !== playerId));
      } else {
        // Add player to selection (max 11)
        if (currentSelection.length < 11) {
          setSelectedOpponentTeamMembers([...currentSelection, playerId]);
        }
      }
    }
  };

  // Update playing XI when selections change
  useEffect(() => {
    if (selectedMyTeam && myTeamMembers.length > 0) {
      const selectedPlayers = selectedMyTeamMembers.map(playerId => {
        const member = myTeamMembers.find(m => m.id === playerId);
        return {
          name: member?.profileName || member?.username || '',
          hasAccount: true,
          username: member?.username,
          userId: member?.id,
        };
      });
      
      // Fill remaining slots with empty players
      const emptySlots = 11 - selectedPlayers.length;
      const emptyPlayers = Array(emptySlots).fill(null).map(() => ({
        name: "",
        hasAccount: false,
        username: undefined,
        userId: undefined,
      }));
      
      setMyTeamPlayers([...selectedPlayers, ...emptyPlayers]);
    }
  }, [selectedMyTeamMembers, myTeamMembers, selectedMyTeam]);

  useEffect(() => {
    if (selectedOpponentTeam && opponentTeamMembers.length > 0) {
      const selectedPlayers = selectedOpponentTeamMembers.map(playerId => {
        const member = opponentTeamMembers.find(m => m.id === playerId);
        return {
          name: member?.profileName || member?.username || '',
          hasAccount: true,
          username: member?.username,
          userId: member?.id,
        };
      });
      
      // Fill remaining slots with empty players
      const emptySlots = 11 - selectedPlayers.length;
      const emptyPlayers = Array(emptySlots).fill(null).map(() => ({
        name: "",
        hasAccount: false,
        username: undefined,
        userId: undefined,
      }));
      
      setOpponentTeamPlayers([...selectedPlayers, ...emptyPlayers]);
    }
  }, [selectedOpponentTeamMembers, opponentTeamMembers, selectedOpponentTeam]);

  // Function to validate a single username
  const validateUsername = async (username: string, playerKey: string) => {
    setUsernameValidation(prev => ({
      ...prev,
      [playerKey]: { isValidating: true, isValid: null }
    }));

    try {
      const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (response.ok) {
        // Username exists (available = false means username is taken, which is what we want)
        const userExists = !data.available;
        
        if (userExists) {
          // Get user details to store userId using public endpoint
          const userResponse = await fetch(`/api/users/lookup-username?username=${encodeURIComponent(username)}`);
          
          if (userResponse.ok) {
            const result = await userResponse.json();
            
            if (result.found) {
              setUsernameValidation(prev => ({
                ...prev,
                [playerKey]: { 
                  isValidating: false, 
                  isValid: true,
                  userId: result.user.id 
                }
              }));

              // Update the player's userId
              const isMyTeam = playerKey.startsWith('my-');
              const playerIndex = parseInt(playerKey.split('-')[1]);
              
              if (isMyTeam) {
                updateMyTeamPlayer(playerIndex, 'userId', result.user.id);
              } else {
                updateOpponentTeamPlayer(playerIndex, 'userId', result.user.id);
              }

              // Track this username as validated
              setLastValidatedUsernames(prev => ({
                ...prev,
                [playerKey]: username
              }));
            } else {
              setUsernameValidation(prev => ({
                ...prev,
                [playerKey]: { isValidating: false, isValid: true }
              }));
              
              setLastValidatedUsernames(prev => ({
                ...prev,
                [playerKey]: username
              }));
            }
          } else {
            setUsernameValidation(prev => ({
              ...prev,
              [playerKey]: { isValidating: false, isValid: true }
            }));
            
            setLastValidatedUsernames(prev => ({
              ...prev,
              [playerKey]: username
            }));
          }
        } else {
          setUsernameValidation(prev => ({
            ...prev,
            [playerKey]: { isValidating: false, isValid: false }
          }));
          
          // Track this username as validated (even if invalid)
          setLastValidatedUsernames(prev => ({
            ...prev,
            [playerKey]: username
          }));
        }
      } else {
        setUsernameValidation(prev => ({
          ...prev,
          [playerKey]: { isValidating: false, isValid: false }
        }));
        
        setLastValidatedUsernames(prev => ({
          ...prev,
          [playerKey]: username
        }));
      }
    } catch (error) {
      setUsernameValidation(prev => ({
        ...prev,
        [playerKey]: { isValidating: false, isValid: false }
      }));
      
      setLastValidatedUsernames(prev => ({
        ...prev,
        [playerKey]: username
      }));
    }
  };

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
  const bothTeamsHavePlayers = myTeamSize === 11 && opponentTeamSize === 11;
  const bothTeamsComplete = myTeamSize > 0 && opponentTeamSize > 0;

  // Get current overs value (custom or preset)
  const getCurrentOvers = () => {
    return overs === "custom" ? customOvers : overs;
  };

  // Validate custom configuration
  const isValidCustomConfig = () => {
    if (overs !== "custom") return true;
    if (!customOvers) return false;
    
    const totalOvers = parseInt(customOvers);
    return totalOvers > 0 && totalOvers <= 50;
  };

  // Bowling restrictions removed
  const getBowlingRestrictions = () => {
    return "No bowling restrictions";
  };

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
            {/* Overs Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Match Format</label>
                <Select value={overs} onValueChange={setOvers}>
                  <SelectTrigger data-testid="select-overs">
                    <SelectValue placeholder="Select match format" />
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
                      // Allow empty string or numbers only
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
                    {overs === "custom" && customOvers ? `${customOvers} Overs Match` : `${overs || "20"} Overs Match`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="bowling-restrictions">
                    {getBowlingRestrictions()}
                  </p>
                </div>
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
      
      {/* Custom Configuration Validation Alert */}
      {overs === "custom" && !isValidCustomConfig() && customOvers && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            Invalid configuration. Overs must be between 1 and 50.
          </AlertDescription>
        </Alert>
      )}

      {/* Spectator Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-purple-600" />
            Match Spectators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Allow Spectators Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">Allow Spectators</label>
                <p className="text-xs text-muted-foreground">
                  Let other players watch this match live
                </p>
              </div>
              <Switch
                checked={allowSpectators}
                onCheckedChange={setAllowSpectators}
                data-testid="switch-allow-spectators"
              />
            </div>

            {/* Spectator Selection Section - Only show when toggle is ON */}
            {allowSpectators && (
              <div className="border-t pt-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Add Spectators</h4>
                  <p className="text-xs text-muted-foreground">
                    Selected spectators will receive notifications when the match starts and can watch the live scoreboard.
                  </p>
                  
                  {/* Team Members Section */}
                  {(selectedMyTeam || selectedOpponentTeam) && (
                    <div className="space-y-4">
                      {/* My Team Members */}
                      {selectedMyTeam && myTeamMembers.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">{myTeamName} Members</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {myTeamMembers.map((member) => {
                              const isSelected = selectedSpectators.includes(member.id);
                              return (
                                <div
                                  key={member.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedSpectators(prev => prev.filter(id => id !== member.id));
                                    } else {
                                      setSelectedSpectators(prev => [...prev, member.id]);
                                    }
                                  }}
                                  className={`
                                    p-2 rounded-lg border cursor-pointer transition-all
                                    ${isSelected 
                                      ? 'bg-purple-100 dark:bg-purple-900/20 border-purple-500 text-purple-800 dark:text-purple-200' 
                                      : 'bg-background border-border hover:bg-muted hover:border-muted-foreground'
                                    }
                                  `}
                                  data-testid={`spectator-card-my-${member.id}`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-500' : 'bg-muted-foreground'}`}></div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {member.profileName || member.username}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        @{member.username}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Opponent Team Members */}
                      {selectedOpponentTeam && opponentTeamMembers.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">{opponentTeamName} Members</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {opponentTeamMembers.map((member) => {
                              const isSelected = selectedSpectators.includes(member.id);
                              return (
                                <div
                                  key={member.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedSpectators(prev => prev.filter(id => id !== member.id));
                                    } else {
                                      setSelectedSpectators(prev => [...prev, member.id]);
                                    }
                                  }}
                                  className={`
                                    p-2 rounded-lg border cursor-pointer transition-all
                                    ${isSelected 
                                      ? 'bg-purple-100 dark:bg-purple-900/20 border-purple-500 text-purple-800 dark:text-purple-200' 
                                      : 'bg-background border-border hover:bg-muted hover:border-muted-foreground'
                                    }
                                  `}
                                  data-testid={`spectator-card-opponent-${member.id}`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-500' : 'bg-muted-foreground'}`}></div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {member.profileName || member.username}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        @{member.username}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Search Players Section */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Search Players</h5>
                    <div className="relative">
                      <Input
                        placeholder="Search players by username..."
                        value={spectatorSearch}
                        onChange={(e) => setSpectatorSearch(e.target.value)}
                        data-testid="input-spectator-search"
                        className="pr-8"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {/* Search Results */}
                    {spectatorSearch.trim().length >= 3 && (
                      <div className="border border-border rounded-md max-h-48 overflow-y-auto">
                        {isSearchingSpectators ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                            Searching players...
                          </div>
                        ) : spectatorSearchResults.length > 0 ? (
                          <div className="py-1">
                            {spectatorSearchResults.map((player) => {
                              const isSelected = selectedSpectators.includes(player.id);
                              return (
                                <div
                                  key={player.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedSpectators(prev => prev.filter(id => id !== player.id));
                                    } else {
                                      setSelectedSpectators(prev => [...prev, player.id]);
                                    }
                                  }}
                                  className={`px-3 py-2 cursor-pointer hover:bg-muted transition-colors flex items-center justify-between ${isSelected ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                                  data-testid={`spectator-search-result-${player.id}`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{player.profileName || player.username}</span>
                                    <span className="text-xs text-muted-foreground">@{player.username}</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-purple-600" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            No players found matching "{spectatorSearch}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Spectators Summary */}
                  {selectedSpectators.length > 0 && (
                    <div className="bg-muted rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {selectedSpectators.length} spectator{selectedSpectators.length !== 1 ? 's' : ''} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSpectators([])}
                          data-testid="button-clear-spectators"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Room Match Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-indigo-600" />
            Room Match Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Room Match Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">Enable Room Match</label>
                <p className="text-xs text-muted-foreground">
                  Create a private match room with password protection
                </p>
              </div>
              <Switch
                checked={isRoomMatch}
                onCheckedChange={setIsRoomMatch}
                data-testid="switch-room-match"
              />
            </div>

            {/* Password Field - Only show when Room Match is ON */}
            {isRoomMatch && (
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Room Password</label>
                  <Input
                    type="password"
                    placeholder="Set a password for this match room"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    data-testid="input-room-password"
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">
                    Spectators will need this password to join and watch your match
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
            <div className="mb-4">
              <Select
                value={selectedMyTeam}
                onValueChange={handleMyTeamSelect}
                disabled={userTeamsLoading}
              >
                <SelectTrigger data-testid="select-my-team">
                  <SelectValue placeholder={myTeamName || "Select from your teams"} />
                </SelectTrigger>
                <SelectContent>
                  {userTeamsLoading ? (
                    <SelectItem value="loading" disabled>Loading teams...</SelectItem>
                  ) : userTeams && userTeams.length > 0 ? (
                    userTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id} data-testid={`option-my-team-${team.id}`}>
                        {team.name} - Captain: {team.captain?.profileName || team.captain?.username || "Unknown"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-teams" disabled>No teams found. Create a team first.</SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {/* Selected team display or manual input */}
              {selectedMyTeam ? (
                <div className="p-2 bg-muted rounded-md mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Selected: {myTeamName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMyTeam("");
                        setMyTeamName("");
                        // Clear team members and selection
                        setMyTeamMembers([]);
                        setSelectedMyTeamMembers([]);
                        setMyTeamPlayers(Array(11).fill(null).map(() => ({
                          name: "",
                          hasAccount: false,
                          username: undefined,
                          userId: undefined,
                        })));
                      }}
                      data-testid="button-clear-my-team"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Input
                  placeholder="Or enter custom team name (optional)"
                  value={myTeamName}
                  onChange={(e) => setMyTeamName(e.target.value)}
                  data-testid="input-my-team-name-custom"
                  className="font-medium mt-2"
                />
              )}
            </div>
            
            {/* Player Selection Interface */}
            {selectedMyTeam && myTeamMembers.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Select Playing XI ({selectedMyTeamMembers.length}/11)</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMyTeamMembers([])}
                    disabled={selectedMyTeamMembers.length === 0}
                    data-testid="button-clear-my-team-selection"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {myTeamMembers.map((member) => {
                    const isSelected = selectedMyTeamMembers.includes(member.id);
                    const canSelect = selectedMyTeamMembers.length < 11;
                    
                    return (
                      <div
                        key={member.id}
                        onClick={() => togglePlayerSelection(member.id, true)}
                        className={`
                          p-2 rounded-lg border cursor-pointer transition-all
                          ${isSelected 
                            ? 'bg-green-100 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200' 
                            : canSelect 
                              ? 'bg-background border-border hover:bg-muted hover:border-muted-foreground' 
                              : 'bg-muted/50 border-muted text-muted-foreground cursor-not-allowed'
                          }
                        `}
                        data-testid={`player-card-my-${member.id}`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-green-500' : 'bg-muted-foreground'}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.profileName || member.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{member.username}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Click on player cards to select them for your playing XI
                </div>
              </div>
            )}
            
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
                          <div className="relative">
                            <Input
                              placeholder="@username"
                              value={player.username || ""}
                              onChange={(e) => updateMyTeamPlayer(index, "username", e.target.value)}
                              data-testid={`input-my-team-username-${index + 1}`}
                              className="text-sm pr-8"
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              {(() => {
                                const validation = usernameValidation[`my-${index}`];
                                if (!player.username || player.username.length < 3) return null;
                                if (validation?.isValidating) {
                                  return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
                                }
                                if (validation?.isValid === true) {
                                  return <Check className="h-4 w-4 text-green-500" data-testid={`icon-valid-my-${index + 1}`} />;
                                }
                                if (validation?.isValid === false) {
                                  return <X className="h-4 w-4 text-red-500" data-testid={`icon-invalid-my-${index + 1}`} />;
                                }
                                return null;
                              })()}
                            </div>
                          </div>
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
            <div className="mb-4 space-y-2">
              <div className="relative">
                <div className="relative">
                  <Input
                    placeholder="Search for opponent team..."
                    value={opponentTeamSearch}
                    onChange={(e) => {
                      setOpponentTeamSearch(e.target.value);
                      if (!e.target.value) {
                        setSelectedOpponentTeam("");
                        setOpponentTeamName("");
                      }
                    }}
                    data-testid="input-opponent-team-search"
                    className="font-medium pr-8"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              
                {/* Search Results Dropdown */}
                {(opponentTeamSearch.trim().length >= 2 && (isSearching || searchResults.length > 0)) && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                    {isSearching ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                        Searching teams...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-1">
                        {searchResults.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => handleOpponentTeamSelect(team.id)}
                            className="px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                            data-testid={`option-opponent-team-${team.id}`}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{team.name}</span>
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Crown className="h-3 w-3 mr-1" />
                                Captain: {team.captain.profileName || team.captain.username}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        No teams found matching "{opponentTeamSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected team display or manual input */}
              {selectedOpponentTeam ? (
                <div className="p-2 bg-muted rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Selected: {opponentTeamName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOpponentTeam("");
                        setOpponentTeamName("");
                        setOpponentTeamSearch("");
                        // Clear team members and selection
                        setOpponentTeamMembers([]);
                        setSelectedOpponentTeamMembers([]);
                        setOpponentTeamPlayers(Array(11).fill(null).map(() => ({
                          name: "",
                          hasAccount: false,
                          username: undefined,
                          userId: undefined,
                        })));
                      }}
                      data-testid="button-clear-opponent-team"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : !opponentTeamSearch && (
                <Input
                  placeholder="Or enter custom team name (optional)"
                  value={opponentTeamName}
                  onChange={(e) => setOpponentTeamName(e.target.value)}
                  data-testid="input-opponent-team-name-custom"
                  className="font-medium"
                />
              )}
            </div>
            
            {/* Player Selection Interface */}
            {selectedOpponentTeam && opponentTeamMembers.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Select Playing XI ({selectedOpponentTeamMembers.length}/11)</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOpponentTeamMembers([])}
                    disabled={selectedOpponentTeamMembers.length === 0}
                    data-testid="button-clear-opponent-team-selection"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {opponentTeamMembers.map((member) => {
                    const isSelected = selectedOpponentTeamMembers.includes(member.id);
                    const canSelect = selectedOpponentTeamMembers.length < 11;
                    
                    return (
                      <div
                        key={member.id}
                        onClick={() => togglePlayerSelection(member.id, false)}
                        className={`
                          p-2 rounded-lg border cursor-pointer transition-all
                          ${isSelected 
                            ? 'bg-red-100 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200' 
                            : canSelect 
                              ? 'bg-background border-border hover:bg-muted hover:border-muted-foreground' 
                              : 'bg-muted/50 border-muted text-muted-foreground cursor-not-allowed'
                          }
                        `}
                        data-testid={`player-card-opponent-${member.id}`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-red-500' : 'bg-muted-foreground'}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.profileName || member.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{member.username}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Click on player cards to select them for the playing XI
                </div>
              </div>
            )}
            
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
                          <div className="relative">
                            <Input
                              placeholder="@username"
                              value={player.username || ""}
                              onChange={(e) => updateOpponentTeamPlayer(index, "username", e.target.value)}
                              data-testid={`input-opponent-team-username-${index + 1}`}
                              className="text-sm pr-8"
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              {(() => {
                                const validation = usernameValidation[`opp-${index}`];
                                if (!player.username || player.username.length < 3) return null;
                                if (validation?.isValidating) {
                                  return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
                                }
                                if (validation?.isValid === true) {
                                  return <Check className="h-4 w-4 text-green-500" data-testid={`icon-valid-opp-${index + 1}`} />;
                                }
                                if (validation?.isValid === false) {
                                  return <X className="h-4 w-4 text-red-500" data-testid={`icon-invalid-opp-${index + 1}`} />;
                                }
                                return null;
                              })()}
                            </div>
                          </div>
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
            if (allowSpectators && selectedSpectators.length > 0) {
              // Create live match with spectators and send notifications
              createLiveMatchMutation.mutate();
            } else {
              // Regular local match flow - store in localStorage only
              // Filter out empty players
              const filteredMyTeamPlayers = myTeamPlayers.filter(p => p.name.trim() !== "");
              const filteredOpponentTeamPlayers = opponentTeamPlayers.filter(p => p.name.trim() !== "");
              
              localStorage.setItem('myTeamPlayers', JSON.stringify(filteredMyTeamPlayers));
              localStorage.setItem('opponentTeamPlayers', JSON.stringify(filteredOpponentTeamPlayers));
              localStorage.setItem('myTeamName', myTeamName || 'My Team');
              localStorage.setItem('opponentTeamName', opponentTeamName || 'Opponent Team');
              localStorage.setItem('myTeamId', selectedMyTeam || ''); // Store team ID for endpoint selection
              localStorage.setItem('opponentTeamId', selectedOpponentTeam || ''); // Store team ID for endpoint selection
              localStorage.setItem('matchOvers', getCurrentOvers());
              
              // Debug: Log what team IDs are being stored
              console.log('=== MATCH CREATION - TEAM IDS STORED ===');
              console.log('Selected teams:', {
                selectedMyTeam: selectedMyTeam || '(none)',
                selectedOpponentTeam: selectedOpponentTeam || '(none)',
                myTeamName: myTeamName || 'My Team',
                opponentTeamName: opponentTeamName || 'Opponent Team'
              });
              console.log('Stored in localStorage:', {
                myTeamId: selectedMyTeam || '',
                opponentTeamId: selectedOpponentTeam || '',
                myTeamName: myTeamName || 'My Team',
                opponentTeamName: opponentTeamName || 'Opponent Team'
              });
              
              setLocation('/coin-toss');
            }
          }}
          disabled={!bothTeamsComplete || !isValidCustomConfig() || createLiveMatchMutation.isPending}
          data-testid="button-save-local-match"
          className="px-8"
        >
          {createLiveMatchMutation.isPending ? "Creating Live Match..." : "Start Match"}
        </Button>
      </div>
      {/* Additional Info */}
      {bothTeamsComplete && (
        <div className="mt-4 text-center">
          <p className="text-sm text-green-600 dark:text-green-400" data-testid="teams-ready">
            ✓ Both teams ready with {myTeamSize} players each
          </p>
        </div>
      )}
      {/* Team validation warnings */}
      {(myTeamSize > 0 || opponentTeamSize > 0) && !bothTeamsComplete && (
        <div className="mt-4 text-center">
          <p className="text-sm text-amber-600 dark:text-amber-400" data-testid="teams-incomplete">
            ⚠️ Both teams need at least 1 player each (My Team: {myTeamSize} players, Opponent: {opponentTeamSize} players)
          </p>
        </div>
      )}
    </div>
  );
}