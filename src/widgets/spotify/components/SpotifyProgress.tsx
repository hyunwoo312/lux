import { Slider } from "@/components/ui/slider";

type SpotifyProgressProps = {
  durationMs: number;
  displayedProgressMs: number;
  leftLabel: string;
  rightLabel: string;
  showLabels?: boolean;
  disabled: boolean;
  onChange: (positionMs: number) => void;
  onCommit: () => void;
};

export function SpotifyProgress({
  durationMs,
  displayedProgressMs,
  leftLabel,
  rightLabel,
  showLabels = true,
  disabled,
  onChange,
  onCommit,
}: SpotifyProgressProps) {
  return (
    <div className="flex flex-col gap-1">
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
      {showLabels && (
        <div className="text-ink-3 flex justify-between text-micro tabular-nums">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
