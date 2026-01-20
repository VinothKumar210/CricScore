import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TossModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamA: { id: string; name: string; logo?: string };
  teamB: { id: string; name: string; logo?: string };
  onTossComplete: (tossWinner: "teamA" | "teamB", decision: "bat" | "bowl") => void;
}

export function TossModal({ 
  open, 
  onOpenChange, 
  teamA, 
  teamB, 
  onTossComplete 
}: TossModalProps) {
  const [tossWinner, setTossWinner] = useState<"teamA" | "teamB" | null>(null);
  const [decision, setDecision] = useState<"bat" | "bowl" | null>(null);

  const handleStartScoring = () => {
    if (tossWinner && decision) {
      onTossComplete(tossWinner, decision);
      onOpenChange(false);
      setTossWinner(null);
      setDecision(null);
    }
  };

  const canStartScoring = tossWinner !== null && decision !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 rounded-3xl p-0 gap-0">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute left-4 top-4 p-1 rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-12 space-y-6">
          <h2 className="text-xl font-bold text-foreground text-center">
            Who won the toss?
          </h2>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setTossWinner("teamA")}
              className={cn(
                "flex flex-col items-center p-4 rounded-2xl border-2 transition-all min-w-[120px]",
                tossWinner === "teamA"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-2">
                {teamA.logo ? (
                  <img src={teamA.logo} alt={teamA.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <span className="font-semibold text-sm text-foreground text-center line-clamp-2">
                {teamA.name}
              </span>
            </button>

            <button
              onClick={() => setTossWinner("teamB")}
              className={cn(
                "flex flex-col items-center p-4 rounded-2xl border-2 transition-all min-w-[120px]",
                tossWinner === "teamB"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-2">
                {teamB.logo ? (
                  <img src={teamB.logo} alt={teamB.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <span className="font-semibold text-sm text-foreground text-center line-clamp-2">
                {teamB.name}
              </span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground text-center">
              Decided to?
            </h3>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDecision("bat")}
                className={cn(
                  "px-8 py-2.5 rounded-lg border-2 font-medium transition-all",
                  decision === "bat"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted text-foreground hover:border-muted-foreground/30"
                )}
              >
                Bat
              </button>
              <button
                onClick={() => setDecision("bowl")}
                className={cn(
                  "px-8 py-2.5 rounded-lg border-2 font-medium transition-all",
                  decision === "bowl"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted text-foreground hover:border-muted-foreground/30"
                )}
              >
                Bowl
              </button>
            </div>
          </div>

          <Button
            onClick={handleStartScoring}
            disabled={!canStartScoring}
            className="w-full bg-[#008B8B] hover:bg-[#007777] text-white h-12"
          >
            START SCORING
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
