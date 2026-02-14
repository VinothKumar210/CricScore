import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import { Search, X, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team } from "@shared/schema";

interface TeamSelectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamSelect: (team: { id: string; name: string; logo?: string; players?: any[] }) => void;
  isMyTeam: boolean;
  onCreateTeam?: () => void;
}

interface TeamSuggestion {
  id: string;
  name: string;
  teamCode: string;
  logoUrl?: string;
}

export function TeamSelectSheet({
  open,
  onOpenChange,
  onTeamSelect,
  isMyTeam,
  onCreateTeam
}: TeamSelectSheetProps) {
  const { user } = useAuth();
  const [teamIdSearch, setTeamIdSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: userTeams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user && isMyTeam,
  });

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (teamIdSearch.trim().length >= 1) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
          const response = await fetch(`${baseUrl}/api/teams/search?q=${encodeURIComponent(teamIdSearch.trim())}`, { headers, credentials: "include" });
          if (response.ok) {
            const teams = await response.json();
            setSuggestions(teams.map((t: any) => ({
              id: t.id,
              name: t.name,
              teamCode: t.teamCode,
              logoUrl: t.logoUrl
            })));
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [teamIdSearch]);

  const fetchTeamWithMembers = async (teamId: string) => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const [teamResponse, membersResponse, guestPlayersResponse] = await Promise.all([
      fetch(`${baseUrl}/api/teams/${teamId}`, { headers, credentials: "include" }),
      fetch(`${baseUrl}/api/teams/${teamId}/members`, { headers, credentials: "include" }),
      fetch(`${baseUrl}/api/teams/${teamId}/guest-players`, { headers, credentials: "include" }),
    ]);

    if (!teamResponse.ok) {
      throw new Error("Team not found");
    }

    const team = await teamResponse.json();
    const members = membersResponse.ok ? await membersResponse.json() : [];
    const guestPlayers = guestPlayersResponse.ok ? await guestPlayersResponse.json() : [];

    const players = [
      ...members.map((m: any) => ({
        id: m.user?.id || m.userId || `member-${Math.random().toString(36).substr(2, 9)}`,
        name: m.user?.profileName || m.user?.username || m.username || "Unknown",
        hasAccount: true,
        username: m.user?.username || m.username || "",
        userId: m.user?.id || m.userId,
        profileImage: m.user?.profileImage,
      })),
      ...guestPlayers.map((g: any) => ({
        id: g.id || `guest-${Math.random().toString(36).substr(2, 9)}`,
        name: g.name,
        hasAccount: false,
        username: "",
        guestPlayerId: g.id,
      })),
    ];

    return {
      id: team.id,
      name: team.name,
      logo: team.logoUrl,
      players,
    };
  };

  const fetchTeamByCode = async (teamCode: string) => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const teamResponse = await fetch(`${baseUrl}/api/teams/by-code/${encodeURIComponent(teamCode)}`, { headers, credentials: "include" });
    if (!teamResponse.ok) {
      throw new Error("Team not found");
    }

    const team = await teamResponse.json();
    return fetchTeamWithMembers(team.id);
  };

  const handleSearchByTeamId = async () => {
    if (!teamIdSearch.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setShowSuggestions(false);

    try {
      const teamWithMembers = await fetchTeamByCode(teamIdSearch.trim());
      onTeamSelect(teamWithMembers);
      onOpenChange(false);
      setTeamIdSearch("");
    } catch (error) {
      setSearchError("Team not found. Please check the Team ID.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: TeamSuggestion) => {
    setIsSearching(true);
    setSearchError(null);
    setShowSuggestions(false);

    try {
      const teamWithMembers = await fetchTeamWithMembers(suggestion.id);
      onTeamSelect(teamWithMembers);
      onOpenChange(false);
      setTeamIdSearch("");
    } catch (error) {
      setSearchError("Failed to load team members.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUserTeam = async (team: Team) => {
    setIsSearching(true);
    try {
      const teamWithMembers = await fetchTeamWithMembers(team.id);
      onTeamSelect(teamWithMembers);
      onOpenChange(false);
    } catch (error) {
      setSearchError("Failed to load team members.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 bg-white">
        <div className="bg-white text-gray-900 px-4 py-4 rounded-t-3xl flex items-center gap-3 border-b">
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
          <SheetTitle className="text-gray-900 text-lg font-semibold">Select Team</SheetTitle>
          <SheetDescription className="sr-only">
            Search for a team by ID or select from your existing teams
          </SheetDescription>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto h-[calc(85vh-60px)] bg-white">
          <div>
            <h3 className="font-semibold text-blue-600 mb-3">Option 1</h3>
            <div className="relative">
              <Input
                placeholder="Search by Team ID (e.g. ctid1)"
                value={teamIdSearch}
                onChange={(e) => setTeamIdSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByTeamId()}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="pr-10 text-center border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
              />
              <button
                onClick={handleSearchByTeamId}
                disabled={isSearching || !teamIdSearch.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                        {suggestion.logoUrl ? (
                          <img
                            src={suggestion.logoUrl}
                            alt={suggestion.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{suggestion.name}</p>
                        <p className="text-xs text-blue-600">{suggestion.teamCode}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {searchError && (
              <p className="text-red-500 text-sm mt-2">{searchError}</p>
            )}
          </div>

          {isMyTeam && (
            <>
              <div>
                <h3 className="font-semibold text-blue-600 mb-3">Option 2</h3>
                <Button
                  onClick={onCreateTeam}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold h-12 rounded-xl shadow-md"
                >
                  CREATE NEW TEAM
                </Button>
              </div>

              <div>
                <h3 className="font-semibold text-blue-600 mb-2">Option 3</h3>
                <p className="text-sm text-gray-500 mb-3">Select one from your existing teams</p>

                {teamsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : userTeams && userTeams.length > 0 ? (
                  <div className="space-y-2">
                    {userTeams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => handleSelectUserTeam(team)}
                        disabled={isSearching}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 border border-gray-200"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                          {(team as any).logoUrl ? (
                            <img
                              src={(team as any).logoUrl}
                              alt={team.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900">{team.name}</span>
                          <p className="text-xs text-blue-600">{(team as any).teamCode}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No teams found</p>
                    <p className="text-sm">Create a team or search by Team ID</p>
                  </div>
                )}
              </div>
            </>
          )}

          {!isMyTeam && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Enter the opponent's Team ID above to find their team</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
