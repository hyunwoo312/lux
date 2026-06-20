import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { WidgetPalette } from "@/app/WidgetPalette";
import { useSettingsStore } from "@/settings";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useDashboardStore } from "@/stores/useDashboardStore";

export function Header() {
  const editing = useDashboardStore((s) => s.editing);
  const toggleEditing = useDashboardStore((s) => s.toggleEditing);
  const openSettings = useSettingsStore((s) => s.openSettings);

  return (
    <header className="grid grid-cols-3 items-center gap-4">
      <div
        data-tour="toolbar"
        className="glass col-start-2 flex items-center gap-1 justify-self-center rounded-lg p-1"
      >
        <ThemeToggle />
        <WidgetPalette />
        <Tooltip content={editing ? "Done" : "Edit mode"} sticky>
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-10 [&_svg]:size-5", editing && "bg-accent text-foreground")}
            aria-label={editing ? "Done editing layout" : "Edit layout"}
            onClick={toggleEditing}
          >
            <span className="relative grid size-5 place-items-center">
              <Pencil
                className={cn(
                  "absolute transition-all duration-300 ease-out",
                  editing ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
                )}
              />
              <Check
                className={cn(
                  "absolute transition-all duration-300 ease-out",
                  editing ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0",
                )}
              />
            </span>
          </Button>
        </Tooltip>
        <Tooltip content="Settings">
          <Button
            data-tour="settings"
            variant="ghost"
            size="icon"
            className="size-10 [&_svg]:size-5"
            aria-label="Settings"
            onClick={() => openSettings()}
          >
            <Settings />
          </Button>
        </Tooltip>
      </div>
      <HeaderClock className="
        glass col-start-3 inline-flex items-center justify-self-end self-stretch rounded-md px-3
      " />
    </header>
  );
}

function HeaderClock({ className }: { className?: string }) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: !clock24h }),
    [clock24h],
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const parts = formatter.formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value;
  const colonVisible = now.getSeconds() % 2 === 0;

  return (
    <span
      className={cn(
        "text-foreground text-2xl font-semibold tracking-wide tabular-nums",
        className,
      )}
    >
      {hour}
      <span
        className={cn("mx-0.5 transition-opacity duration-150", !colonVisible && "opacity-0")}
      >
        :
      </span>
      {minute}
      {dayPeriod ? <span className="text-muted-foreground ml-1">{dayPeriod}</span> : null}
    </span>
  );
}
