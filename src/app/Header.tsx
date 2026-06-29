import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { LuxMark } from "@/components/LuxMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { ChangelogDialog, consumeChangelogAutoShow, useHasUnseenRelease } from "@/changelog";
import { WidgetPalette } from "@/app/WidgetPalette";
import { useSettingsStore } from "@/settings";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useDashboardStore } from "@/stores/useDashboardStore";

export function Header() {
  const editing = useDashboardStore((s) => s.editing);
  const toggleEditing = useDashboardStore((s) => s.toggleEditing);
  const openSettings = useSettingsStore((s) => s.openSettings);
  const hasUnseenRelease = useHasUnseenRelease();
  const [changelogOpen, setChangelogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void consumeChangelogAutoShow().then((show) => {
      if (active && show) setChangelogOpen(true);
    });
    return () => {
      active = false;
    };
  }, []);

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
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Tooltip content="What's new">
          <Button
            variant="ghost"
            size="icon"
            className="relative size-10 [&_svg]:size-5"
            aria-label={hasUnseenRelease ? "What's new — update available" : "What's new"}
            onClick={() => setChangelogOpen(true)}
          >
            <LuxMark className="size-5" />
            {hasUnseenRelease && (
              <span aria-hidden className="bg-primary absolute top-2 right-2 size-1.5 rounded-full" />
            )}
          </Button>
        </Tooltip>
      </div>

      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
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
