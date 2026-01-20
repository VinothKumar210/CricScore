import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

  const { data: userTeams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user && isMyTeam,
  });

  const fetchTeamWithMembers = async (teamId: string) => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const [teamResponse, membersResponse, guestPlayersResponse] = await Promise.all([
      fetch(`/api/teams/${teamId}`, { headers }),
      fetch(`/api/teams/${teamId}/members`, { headers }),
      fetch(`/api/teams/${teamId}/guest-players`, { headers }),
    ]);

    if (!teamResponse.ok) {
      throw new Error("Team not found");
    }

    const team = await teamResponse.json();
    const members = membersResponse.ok ? await membersResponse.json() : [];
    const guestPlayers = guestPlayersResponse.ok ? await guestPlayersResponse.json() : [];

    const players = [
      ...members.map((m: any) => ({
        name: m.user?.username || m.username || "Unknown",
        hasAccount: true,
        username: m.user?.username || m.username || "",
        userId: m.user?.id || m.userId,
        profileImage: m.user?.profileImage,
      })),
      ...guestPlayers.map((g: any) => ({
        name: g.name,
        hasAccount: false,
        username: "",
        guestPlayerId: g.id,
      })),
    ];

    return {
      id: team.id,
      name: team.name,
      logo: team.logo,
      players,
    };
  };

  const handleSearchByTeamId = async () => {
    if (!teamIdSearch.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const teamWithMembers = await fetchTeamWithMembers(teamIdSearch.trim());
      onTeamSelect(teamWithMembers);
      onOpenChange(false);
      setTeamIdSearch("");
    } catch (error) {
      setSearchError("Team not found. Please check the Team ID.");
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
        </div>
        
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(85vh-60px)] bg-white">
          <div>
            <h3 className="font-semibold text-blue-600 mb-3">Option 1</h3>
            <div className="relative">
              <Input
                placeholder="Search by Team ID"
                value={teamIdSearch}
                onChange={(e) => setTeamIdSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByTeamId()}
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
                          {(team as any).logo ? (
                            <img 
                              src={(team as any).logo} 
                              alt={team.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{team.name}</span>
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
