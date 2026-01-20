import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface OversSelectorProps {
  overs: number;
  onOversChange: (overs: number) => void;
  ballType: string;
  onBallTypeChange: (type: string) => void;
}

const OVERS_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
const BALL_TYPES = ["Tennis Ball", "Leather Ball", "Cork Ball"];

export function OversSelector({ overs, onOversChange, ballType, onBallTypeChange }: OversSelectorProps) {
  const currentIndex = OVERS_OPTIONS.indexOf(overs);
  const ballTypeIndex = BALL_TYPES.indexOf(ballType);

  const handleOversUp = () => {
    if (currentIndex < OVERS_OPTIONS.length - 1) {
      onOversChange(OVERS_OPTIONS[currentIndex + 1]);
    }
  };

  const handleOversDown = () => {
    if (currentIndex > 0) {
      onOversChange(OVERS_OPTIONS[currentIndex - 1]);
    }
  };

  const handleBallTypeUp = () => {
    if (ballTypeIndex < BALL_TYPES.length - 1) {
      onBallTypeChange(BALL_TYPES[ballTypeIndex + 1]);
    }
  };

  const handleBallTypeDown = () => {
    if (ballTypeIndex > 0) {
      onBallTypeChange(BALL_TYPES[ballTypeIndex - 1]);
    }
  };

  const getMatchFormat = (overs: number) => {
    if (overs <= 5) return "T5";
    if (overs <= 10) return "T10";
    if (overs <= 20) return "T20";
    if (overs <= 50) return "ODI";
    return "Test";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-6">
        <div className="flex flex-col items-center">
          <button
            onClick={handleOversUp}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            disabled={currentIndex >= OVERS_OPTIONS.length - 1}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <div className="text-xl font-bold text-foreground min-w-[60px] text-center">
            {overs}
          </div>
          <button
            onClick={handleOversDown}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            disabled={currentIndex <= 0}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <span className="text-muted-foreground text-sm">Overs</span>

        <span className="text-muted-foreground">-</span>

        <span className="text-sm font-medium text-foreground">{getMatchFormat(overs)}</span>

        <span className="text-muted-foreground">-</span>

        <div className="flex flex-col items-center">
          <button
            onClick={handleBallTypeUp}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            disabled={ballTypeIndex >= BALL_TYPES.length - 1}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <div className="text-sm font-medium text-foreground min-w-[90px] text-center">
            {ballType}
          </div>
          <button
            onClick={handleBallTypeDown}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            disabled={ballTypeIndex <= 0}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
