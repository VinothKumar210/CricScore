import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { localMatchFormSchema, type User, type Team } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { CalendarIcon, MapPinIcon, ClockIcon, UsersIcon, EyeIcon, Search, X } from "lucide-react";

type LiveMatchFormData = z.infer<typeof localMatchFormSchema>;

export default function CreateLiveMatch() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Spectator states
  const [allowSpectators, setAllowSpectators] = useState(false);
  const [selectedSpectators, setSelectedSpectators] = useState<string[]>([]);
  const [spectatorSearch, setSpectatorSearch] = useState("");
  const [spectatorSearchResults, setSpectatorSearchResults] = useState<User[]>([]);
  const [isSearchingSpectators, setIsSearchingSpectators] = useState(false);

  const form = useForm<LiveMatchFormData>({
    resolver: zodResolver(localMatchFormSchema),
    defaultValues: {
      matchName: "",
      venue: "",
      matchDate: new Date().toISOString().split('T')[0],
      overs: 20,
      myTeamName: "",
      opponentTeamName: "",
      myTeamPlayers: Array(11).fill(null).map(() => ({ name: "", hasAccount: false })),
      opponentTeamPlayers: Array(11).fill(null).map(() => ({ name: "", hasAccount: false })),
    },
  });

  // Search spectators
  const searchSpectators = async (query: string) => {
    if (query.trim().length < 2) {
      setSpectatorSearchResults([]);
      return;
    }

    setIsSearchingSpectators(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (response.ok) {
        const users = await response.json();
        setSpectatorSearchResults(users);
      }
    } catch (error) {
      console.error('Error searching spectators:', error);
    } finally {
      setIsSearchingSpectators(false);
    }
  };

  const addSpectator = (user: User) => {
    if (!selectedSpectators.includes(user.id)) {
      setSelectedSpectators(prev => [...prev, user.id]);
      setSpectatorSearch("");
      setSpectatorSearchResults([]);
    }
  };

  const removeSpectator = (userId: string) => {
    setSelectedSpectators(prev => prev.filter(id => id !== userId));
  };

  const createLiveMatchMutation = useMutation({
    mutationFn: async (data: LiveMatchFormData) => {
      const response = await apiRequest('POST', '/api/local-matches', {
        ...data,
        matchDate: new Date(data.matchDate).toISOString(),
        allowSpectators,
        selectedSpectators,
      });
      return response.json();
    },
    onSuccess: (match) => {
      toast({
        title: "Success",
        description: "Live match created successfully! Spectators have been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/local-matches/spectator"] });
      queryClient.invalidateQueries({ queryKey: ["/api/local-matches/ongoing"] });
      setLocation(`/match-view/${match.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create live match",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: LiveMatchFormData) {
    createLiveMatchMutation.mutate(values);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center" data-testid="title-create-live-match">
          <UsersIcon className="mr-2 h-6 w-6 text-primary" />
          Create Live Match
        </h2>
        <p className="text-muted-foreground mt-2">
          Create a live cricket match that spectators can follow in real-time
        </p>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Match Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2 flex items-center">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  Match Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="matchName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Friendly Match, Tournament Final"
                            data-testid="input-match-name"
                            {...field}
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
                        <FormLabel>Venue *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Local Cricket Ground, Park"
                            data-testid="input-venue"
                            {...field}
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
                        <FormLabel>Match Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            data-testid="input-match-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="overs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overs per Team *</FormLabel>
                        <FormControl>
                          <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                            <SelectTrigger data-testid="select-overs">
                              <SelectValue placeholder="Select overs" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 Overs</SelectItem>
                              <SelectItem value="10">10 Overs</SelectItem>
                              <SelectItem value="15">15 Overs</SelectItem>
                              <SelectItem value="20">20 Overs</SelectItem>
                              <SelectItem value="25">25 Overs</SelectItem>
                              <SelectItem value="30">30 Overs</SelectItem>
                              <SelectItem value="40">40 Overs</SelectItem>
                              <SelectItem value="50">50 Overs</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Team Names */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2 flex items-center">
                  <UsersIcon className="mr-2 h-5 w-5" />
                  Team Names
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="myTeamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>My Team Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your team name"
                            data-testid="input-my-team-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="opponentTeamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opponent Team Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter opponent team name"
                            data-testid="input-opponent-team-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Spectator Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2 flex items-center">
                  <EyeIcon className="mr-2 h-5 w-5" />
                  Spectator Settings
                </h3>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-base font-medium">Allow Spectators</div>
                      <div className="text-sm text-muted-foreground">
                        Let other users watch your match live and receive notifications
                      </div>
                    </div>
                    <Switch
                      checked={allowSpectators}
                      onCheckedChange={setAllowSpectators}
                      data-testid="switch-allow-spectators"
                    />
                  </div>
                </div>

                {allowSpectators && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Invite Spectators</div>
                      <div className="text-sm text-muted-foreground">
                        Search and invite users to watch your match. They'll receive notifications when the match starts.
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Input
                        placeholder="Search users by username..."
                        value={spectatorSearch}
                        onChange={(e) => {
                          setSpectatorSearch(e.target.value);
                          searchSpectators(e.target.value);
                        }}
                        data-testid="input-spectator-search"
                        className="pr-8"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      
                      {/* Search Results */}
                      {spectatorSearch.length >= 2 && spectatorSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                          {spectatorSearchResults.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => addSpectator(user)}
                              className="px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                              data-testid={`option-spectator-${user.id}`}
                            >
                              <div className="font-medium">{user.profileName || user.username}</div>
                              <div className="text-xs text-muted-foreground">@{user.username}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Spectators */}
                    {selectedSpectators.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Selected Spectators ({selectedSpectators.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedSpectators.map((spectatorId) => {
                            const user = spectatorSearchResults.find(u => u.id === spectatorId);
                            return (
                              <div
                                key={spectatorId}
                                className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-md text-sm"
                              >
                                <span>{user?.profileName || user?.username || 'Unknown User'}</span>
                                <button
                                  type="button"
                                  onClick={() => removeSpectator(spectatorId)}
                                  className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
                                  data-testid={`button-remove-spectator-${spectatorId}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setLocation('/dashboard')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createLiveMatchMutation.isPending}
                  data-testid="button-create-match"
                >
                  {createLiveMatchMutation.isPending ? "Creating..." : "Create Live Match"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}