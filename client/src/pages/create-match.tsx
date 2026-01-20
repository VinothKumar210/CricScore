import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Users, Trash2, Play, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Fixture {
  id: string;
  teamA: {
    id: string;
    name: string;
    logo?: string;
  };
  teamB: {
    id: string;
    name: string;
    logo?: string;
  };
  overs: number;
  createdAt: string;
}

export default function CreateMatch() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  useEffect(() => {
    const savedFixtures = localStorage.getItem("savedFixtures");
    if (savedFixtures) {
      setFixtures(JSON.parse(savedFixtures));
    }
  }, []);

  const handleDeleteFixture = (id: string) => {
    const updated = fixtures.filter((f) => f.id !== id);
    setFixtures(updated);
    localStorage.setItem("savedFixtures", JSON.stringify(updated));
    toast({
      title: "Fixture Deleted",
      description: "The fixture has been removed.",
    });
  };

  const handleStartFixture = (fixture: Fixture) => {
    localStorage.setItem("selectedFixtureId", fixture.id);
    localStorage.setItem("fixtureTeamA", JSON.stringify(fixture.teamA));
    localStorage.setItem("fixtureTeamB", JSON.stringify(fixture.teamB));
    localStorage.setItem("fixtureOvers", fixture.overs.toString());
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

        {fixtures.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Save className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Saved Fixtures</h2>
            </div>
            <div className="space-y-3">
              {fixtures.map((fixture) => (
                <div
                  key={fixture.id}
                  className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                          {fixture.teamA.logo ? (
                            <img src={fixture.teamA.logo} alt={fixture.teamA.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-900 truncate">{fixture.teamA.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">vs</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="text-xs font-medium text-gray-900 truncate">{fixture.teamB.name}</span>
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                          {fixture.teamB.logo ? (
                            <img src={fixture.teamB.logo} alt={fixture.teamB.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{fixture.overs} Overs</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteFixture(fixture.id)}
                        className="p-1.5 hover:bg-red-100 rounded-full transition-colors"
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

        {fixtures.length === 0 && (
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
