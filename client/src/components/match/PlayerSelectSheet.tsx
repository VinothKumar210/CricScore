import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocalPlayer } from "@shared/schema";

interface PlayerSelectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  players: LocalPlayer[];
  selectedPlayers: LocalPlayer[];
  onPlayerSelect: (player: LocalPlayer) => void;
  onPlayerStatusChange: (player: LocalPlayer, status: "playing" | "bench") => void;
  onAddPlayer: () => void;
  maxSelection?: number;
  showStatusToggle?: boolean;
}

export function PlayerSelectSheet({
  open,
  onOpenChange,
  title,
  players,
  selectedPlayers,
  onPlayerSelect,
  onPlayerStatusChange,
  onAddPlayer,
  maxSelection = 1,
  showStatusToggle = true,
}: PlayerSelectSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlayers = players.filter(
    (player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.username && player.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isSelected = (player: LocalPlayer) =>
    selectedPlayers.some((p) => p.name === player.name);

  const getPlayerStatus = (player: LocalPlayer): "playing" | "bench" => {
    return (player as any).status || "playing";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0">
        <div className="bg-orange-500 text-white px-4 py-4 rounded-t-3xl">
<SheetTitle className="text-white text-lg font-semibold text-center">
              {title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Select players from the list or add new players
            </SheetDescription>
        </div>

        <div className="p-4 space-y-4 flex flex-col h-[calc(80vh-60px)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name or Profile ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredPlayers.map((player, index) => (
              <div
                key={player.name + index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  isSelected(player) ? "bg-orange-50" : "hover:bg-muted/50"
                )}
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {index + 1}
                </span>

                <button
                  onClick={() => onPlayerSelect(player)}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {player.profileImage ? (
                      <img
                        src={player.profileImage}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="text-left">
                    <p className="font-medium text-foreground">{player.name}</p>
                    {player.username && (
                      <p className="text-xs text-muted-foreground">
                        #{player.username}
                      </p>
                    )}
                  </div>
                </button>

                {showStatusToggle && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onPlayerStatusChange(player, "playing")}
                      className={cn(
                        "px-3 py-1 text-xs rounded-md transition-colors",
                        getPlayerStatus(player) === "playing"
                          ? "bg-orange-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      Playing
                    </button>
                    <button
                      onClick={() => onPlayerStatusChange(player, "bench")}
                      className={cn(
                        "px-3 py-1 text-xs rounded-md transition-colors",
                        getPlayerStatus(player) === "bench"
                          ? "bg-orange-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      Bench
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filteredPlayers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No players found</p>
              </div>
            )}
          </div>

          <Button
            onClick={onAddPlayer}
            variant="outline"
            className="w-full border-dashed border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            ADD / CREATE PLAYER
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
