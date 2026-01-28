import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Users, Trash2, Play, Save, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFixturesCache } from "@/hooks/use-fixtures-cache";

interface Fixture {
  id: string;
  teamAId?: string | null;
  teamAName: string;
  teamALogo?: string | null;
  teamAPlayers: { name: string; isCaptain?: boolean; isWicketKeeper?: boolean; id?: string; userId?: string; guestPlayerId?: string }[];
  teamBId?: string | null;
  teamBName: string;
  teamBLogo?: string | null;
  teamBPlayers: { name: string; isCaptain?: boolean; isWicketKeeper?: boolean; id?: string; userId?: string; guestPlayerId?: string }[];
  overs: number;
  venue?: string | null;
  createdAt: string;
}

export default function CreateMatch() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { fixtures, isLoading, error, deleteFixture, isDeleting } = useFixturesCache();

  const handleDeleteFixture = (id: string) => {
    deleteFixture(id, {
      onSuccess: () => {
        toast({
          title: "Fixture Deleted",
          description: "The fixture has been removed.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete fixture.",
          variant: "destructive",
        });
      },
    });
  };

  const handleStartFixture = (fixture: Fixture) => {
    localStorage.setItem("selectedFixtureId", fixture.id);
    localStorage.setItem("fixtureTeamA", JSON.stringify({
      id: fixture.teamAId || `local-${fixture.id}-a`,
      name: fixture.teamAName,
      logo: fixture.teamALogo,
      players: fixture.teamAPlayers,
    }));
    localStorage.setItem("fixtureTeamB", JSON.stringify({
      id: fixture.teamBId || `local-${fixture.id}-b`,
      name: fixture.teamBName,
      logo: fixture.teamBLogo,
      players: fixture.teamBPlayers,
    }));
    localStorage.setItem("fixtureOvers", fixture.overs.toString());
    localStorage.setItem("fixtureVenue", fixture.venue || "");
    setLocation("/local-match?fromFixture=true");
  };

  return (
    <div className="h-[100dvh] w-full max-w-full flex flex-col bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setLocation("/dashboard")}
          className="p-1.5 -ml-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Create Match</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Button
          onClick={() => setLocation("/local-match")}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-12 rounded-xl text-sm font-semibold shadow-md mb-6"
        >
          <Plus className="h-5 w-5 mr-2" />
          NEW MATCH
        </Button>

        {isLoading && (
          <div className="flex flex-col items-center justify-center text-center pt-8">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-xs text-gray-400">Loading fixtures...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-center pt-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Save className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-sm font-semibold text-gray-600 mb-1">Failed to Load Fixtures</h2>
            <p className="text-xs text-gray-400">Please try again later</p>
          </div>
        )}

        {!isLoading && !error && fixtures.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Save className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Saved Fixtures</h2>
            </div>
            <div className="space-y-3">
              {fixtures.map((fixture: Fixture) => (
                <div
                  key={fixture.id}
                  className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                          {fixture.teamALogo ? (
                            <img src={fixture.teamALogo} alt={fixture.teamAName} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-900 truncate">{fixture.teamAName}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">vs</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="text-xs font-medium text-gray-900 truncate">{fixture.teamBName}</span>
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                          {fixture.teamBLogo ? (
                            <img src={fixture.teamBLogo} alt={fixture.teamBName} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{fixture.overs} Overs</span>
                      {fixture.venue && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{fixture.venue}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteFixture(fixture.id)}
                        disabled={isDeleting}
                        className="p-1.5 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                      <button
                        onClick={() => handleStartFixture(fixture)}
                        className="p-1.5 hover:bg-green-100 rounded-full transition-colors"
                      >
                        <Play className="h-4 w-4 text-green-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !error && fixtures.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Save className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-sm font-semibold text-gray-600 mb-1">No Saved Fixtures</h2>
            <p className="text-xs text-gray-400">Save a fixture to quickly start matches later</p>
          </div>
        )}
      </div>
    </div>
  );
}
