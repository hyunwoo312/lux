import { Slider } from "@/components/ui/slider";

type SpotifyProgressProps = {
  durationMs: number;
  displayedProgressMs: number;
  leftLabel: string;
  rightLabel: string;
  disabled: boolean;
  onChange: (positionMs: number) => void;
  onCommit: () => void;
};

export function SpotifyProgress({
  durationMs,
  displayedProgressMs,
  leftLabel,
  rightLabel,
  disabled,
  onChange,
  onCommit,
}: SpotifyProgressProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Slider
        value={[Math.min(displayedProgressMs, durationMs)]}
        min={0}
        max={durationMs || 1}
        step={1000}
        aria-label="Track progress"
        disabled={disabled}
        onValueChange={(values) => onChange(values[0] ?? 0)}
        onValueCommit={onCommit}
      />
      <div className="text-muted-foreground flex justify-between text-2xs tabular-nums">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
