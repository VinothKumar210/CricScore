import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
        <DialogContent className="w-[calc(100vw-32px)] max-w-sm rounded-3xl p-0 gap-0 overflow-hidden bg-white border-none shadow-2xl [&>button]:hidden" aria-describedby="toss-modal-desc">
          <DialogDescription id="toss-modal-desc" className="sr-only">
            Select the team that won the toss and their decision to bat or bowl
          </DialogDescription>
          <button
          onClick={() => onOpenChange(false)}
          className="absolute left-4 top-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors z-10"
        >
          <X className="h-5 w-5 text-slate-600" />
        </button>

        <div className="p-5 pt-10 space-y-5 max-h-[85vh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold text-[#1e3a8a] text-center">
            Who won the toss?
          </DialogTitle>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setTossWinner("teamA")}
              className={cn(
                "flex flex-col items-center p-4 rounded-3xl border-2 transition-all flex-1 max-w-[130px] group",
                tossWinner === "teamA"
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-100 bg-slate-50/30 hover:border-slate-200"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center overflow-hidden mb-2 transition-transform group-hover:scale-105",
                tossWinner === "teamA" ? "bg-blue-100 shadow-inner" : "bg-slate-100"
              )}>
                {teamA.logo ? (
                  <img src={teamA.logo} alt={teamA.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className={cn("h-8 w-8", tossWinner === "teamA" ? "text-blue-600" : "text-slate-400")} />
                )}
              </div>
              <span className={cn(
                "font-bold text-sm text-center line-clamp-2 transition-colors",
                tossWinner === "teamA" ? "text-blue-900" : "text-slate-600"
              )}>
                {teamA.name}
              </span>
            </button>

            <button
              onClick={() => setTossWinner("teamB")}
              className={cn(
                "flex flex-col items-center p-4 rounded-3xl border-2 transition-all flex-1 max-w-[130px] group",
                tossWinner === "teamB"
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-100 bg-slate-50/30 hover:border-slate-200"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center overflow-hidden mb-2 transition-transform group-hover:scale-105",
                tossWinner === "teamB" ? "bg-blue-100 shadow-inner" : "bg-slate-100"
              )}>
                {teamB.logo ? (
                  <img src={teamB.logo} alt={teamB.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className={cn("h-8 w-8", tossWinner === "teamB" ? "text-blue-600" : "text-slate-400")} />
                )}
              </div>
              <span className={cn(
                "font-bold text-sm text-center line-clamp-2 transition-colors",
                tossWinner === "teamB" ? "text-blue-900" : "text-slate-600"
              )}>
                {teamB.name}
              </span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#1e3a8a] text-center">
              Decided to?
            </h3>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDecision("bat")}
                className={cn(
                  "flex-1 py-3 rounded-2xl border-2 font-bold text-base transition-all",
                  decision === "bat"
                    ? "border-blue-500 bg-blue-50/50 text-blue-900 shadow-sm"
                    : "border-slate-100 bg-slate-50/30 text-slate-500 hover:border-slate-200"
                )}
              >
                Bat
              </button>
              <button
                onClick={() => setDecision("bowl")}
                className={cn(
                  "flex-1 py-3 rounded-2xl border-2 font-bold text-base transition-all",
                  decision === "bowl"
                    ? "border-blue-500 bg-blue-50/50 text-blue-900 shadow-sm"
                    : "border-slate-100 bg-slate-50/30 text-slate-500 hover:border-slate-200"
                )}
              >
                Bowl
              </button>
            </div>
          </div>

          <Button
            onClick={handleStartScoring}
            disabled={!canStartScoring}
            className={cn(
              "w-full h-12 rounded-2xl font-extrabold text-base shadow-xl transition-all duration-300 transform active:scale-[0.98]",
              canStartScoring 
                ? "bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white shadow-blue-200 hover:shadow-blue-300 hover:brightness-110" 
                : "bg-slate-200 text-slate-400"
            )}
          >
            START SCORING
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
