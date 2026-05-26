import { useState } from "react";
import { Check, Monitor } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getAccentVars } from "@/widgets/core/accent";
import { SPOTIFY_ACCENT, type SpotifyPlaybackDevice } from "@/widgets/spotify/types";

type SpotifyDeviceMenuProps = {
  devices: SpotifyPlaybackDevice[];
  activeId: string;
  disabled: boolean;
  onSelect: (device: SpotifyPlaybackDevice) => void;
  onOpen: () => void;
};

export function SpotifyDeviceMenu({
  devices,
  activeId,
  disabled,
  onSelect,
  onOpen,
}: SpotifyDeviceMenuProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) onOpen();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label="Choose playback device"
        disabled={disabled}
        className="
          text-muted-foreground inline-flex size-8 items-center justify-center rounded-full
          transition-colors
          hover:text-foreground
          focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none
          disabled:pointer-events-none disabled:opacity-40
        "
      >
        <Monitor className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-56 p-1.5" style={getAccentVars(SPOTIFY_ACCENT)}>
        <div className="flex flex-col gap-0.5">
          {devices.map((device) => {
            const active = device.id === activeId || device.isActive;
            return (
              <button
                key={device.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  if (device.id !== activeId) onSelect(device);
                }}
                className="
                  hover:bg-accent
                  flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors
                  disabled:pointer-events-none disabled:opacity-50
                "
              >
                <Monitor className={cn("size-4 shrink-0", active ? "text-primary" : `
                  text-muted-foreground
                `)} aria-hidden />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm leading-none font-medium">{device.name}</span>
                  <span className="text-muted-foreground text-2xs mt-0.5 truncate">{device.type}</span>
                </span>
                {active && <Check className="text-primary ml-auto size-3.5 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
