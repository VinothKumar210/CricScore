import { cn } from "@/lib/utils";

interface OversSelectorProps {
  overs: number;
  onOversChange: (overs: number) => void;
}

const OVERS_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];

export function OversSelector({ overs, onOversChange }: OversSelectorProps) {
  const currentIndex = OVERS_OPTIONS.indexOf(overs);
  const sliderValue = currentIndex >= 0 ? currentIndex : 0;

  const getMatchFormat = (overs: number) => {
    if (overs <= 5) return "T5";
    if (overs <= 10) return "T10";
    if (overs <= 20) return "T20";
    if (overs <= 50) return "ODI";
    return "Test";
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    onOversChange(OVERS_OPTIONS[index]);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full px-4">
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl font-bold text-foreground">{overs}</span>
        <span className="text-muted-foreground text-sm">Overs</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-sm font-medium text-primary">{getMatchFormat(overs)}</span>
      </div>
      
      <div className="w-full max-w-xs">
        <input
          type="range"
          min={0}
          max={OVERS_OPTIONS.length - 1}
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-[#008B8B]"
          style={{
            background: `linear-gradient(to right, #008B8B 0%, #008B8B ${(sliderValue / (OVERS_OPTIONS.length - 1)) * 100}%, #e2e8f0 ${(sliderValue / (OVERS_OPTIONS.length - 1)) * 100}%, #e2e8f0 100%)`
          }}
        />
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>1</span>
          <span>50</span>
        </div>
      </div>
    </div>
  );
}
