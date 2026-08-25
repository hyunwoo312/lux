import { Volume1, Volume2, VolumeX } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

type SpotifyVolumeProps = {
  volumePercent: number;
  disabled: boolean;
  onChange: (volumePercent: number) => void;
  onCommit: () => void;
};

function VolumeIcon({ volumePercent }: { volumePercent: number }) {
  if (volumePercent <= 0) return <VolumeX className="size-4" aria-hidden />;
  if (volumePercent < 50) return <Volume1 className="size-4" aria-hidden />;
  return <Volume2 className="size-4" aria-hidden />;
}

export function SpotifyVolume({ volumePercent, disabled, onChange, onCommit }: SpotifyVolumeProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Adjust volume, currently ${Math.round(volumePercent)} percent`}
        disabled={disabled}
        className="
          focus-ring text-ink-3 inline-flex size-8 items-center justify-center rounded-full
          transition-colors
          hover:text-ink
          disabled:pointer-events-none disabled:opacity-40
        "
      >
        <VolumeIcon volumePercent={volumePercent} />
      </PopoverTrigger>
      <PopoverContent align="center" side="top" padding="panel" className={"w-44"}>
        <Slider
          value={[Math.round(volumePercent)]}
          min={0}
          max={100}
          step={1}
          aria-label="Volume"
          disabled={disabled}
          onValueChange={(values) => onChange(values[0] ?? 0)}
          onValueCommit={onCommit}
        />
      </PopoverContent>
    </Popover>
  );
}
