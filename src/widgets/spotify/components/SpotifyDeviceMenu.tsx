import { useState } from "react";
import { ROW } from "@/lib/row";
import { Check, Monitor } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { type SpotifyPlaybackDevice } from "@/widgets/spotify/types";

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
          focus-ring text-ink-3 inline-flex size-8 items-center justify-center rounded-full
          transition-colors
          hover:text-ink
          disabled:pointer-events-none disabled:opacity-40
        "
      >
        <Monitor className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className={"w-56 p-1.5"}>
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
                className={cn(ROW.option, "disabled:pointer-events-none disabled:opacity-50")}
              >
                <Monitor
                  className={cn("size-4 shrink-0", active ? "text-primary" : `text-ink-3`)}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body leading-none font-medium">{device.name}</span>
                  <span className="text-ink-3 text-micro mt-0.5 truncate">{device.type}</span>
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
