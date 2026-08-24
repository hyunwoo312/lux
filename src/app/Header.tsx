import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, MessageSquarePlus, Pencil, ScrollText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { clockOptions } from "@/lib/clock";
import { useNow } from "@/hooks/useNow";
import { ChangelogDialog, consumeChangelogAutoShow, useHasUnseenRelease } from "@/changelog";
import { GuideDialog, useGuideStore } from "@/guide";
import { FeedbackDialog } from "@/feedback";
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
  const openGuide = useGuideStore((s) => s.openGuide);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
            size="icon-lg"
            className={cn(editing && "bg-accent text-ink")}
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
            size="icon-lg"
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
            size="icon-lg"
            className="relative"
            aria-label={hasUnseenRelease ? "What's new — update available" : "What's new"}
            onClick={() => setChangelogOpen(true)}
          >
            <ScrollText className="size-5" />
            {hasUnseenRelease && (
              <span
                aria-hidden
                className="bg-primary absolute top-2 right-2 size-1.5 rounded-full"
              />
            )}
          </Button>
        </Tooltip>
        <Tooltip content="Guide">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Open the Lux guide"
            onClick={() => openGuide()}
          >
            <BookOpen className="size-5" />
          </Button>
        </Tooltip>
        <Tooltip content="Send feedback">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Send feedback"
            onClick={() => setFeedbackOpen(true)}
          >
            <MessageSquarePlus className="size-5" />
          </Button>
        </Tooltip>
      </div>

      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
      <GuideDialog />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <HeaderClock
        className="
          glass col-start-3 inline-flex items-center justify-self-end self-stretch rounded-lg px-3
        "
      />
    </header>
  );
}

function HeaderClock({ className }: { className?: string }) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, clockOptions(!clock24h)),
    [clock24h],
  );
  const now = useNow();

  const parts = formatter.formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value;

  return (
    <span
      className={cn("text-ink text-heading font-semibold tracking-wide tabular-nums", className)}
    >
      {hour}
      <span className="mx-0.5">:</span>
      {minute}
      {dayPeriod ? <span className="text-ink-3 ml-1">{dayPeriod}</span> : null}
    </span>
  );
}
