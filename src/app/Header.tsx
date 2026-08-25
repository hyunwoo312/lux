import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, MessageSquarePlus, Pencil, ScrollText, Settings } from "lucide-react";
import { POP } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { clockOptions, formatClockDate } from "@/lib/clock";
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
  const showClock = useAppSettingsStore((s) => s.showClock);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarIndex, setToolbarIndex] = useState(0);

  const toolbarButtons = () => [...(toolbarRef.current?.querySelectorAll("button") ?? [])];

  useEffect(() => {
    toolbarButtons().forEach((button, index) => {
      button.tabIndex = index === toolbarIndex ? 0 : -1;
    });
  });

  const handleToolbarKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const jump = event.key === "Home" ? "first" : event.key === "End" ? "last" : null;
    if (step === 0 && jump === null) return;
    const buttons = toolbarButtons();
    if (buttons.length === 0) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const last = buttons.length - 1;
    const next =
      jump === "first"
        ? 0
        : jump === "last"
          ? last
          : current === -1
            ? 0
            : (current + step + buttons.length) % buttons.length;
    setToolbarIndex(next);
    buttons[next]?.focus();
  };

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
    <header className="grid grid-cols-3 items-center gap-4 pr-(--scrollbar-width)">
      <div
        ref={toolbarRef}
        data-tour="toolbar"
        role="toolbar"
        aria-label="Dashboard actions"
        aria-orientation="horizontal"
        onKeyDown={handleToolbarKeys}
        onFocusCapture={(event) => {
          const button = (event.target as Element).closest("button");
          const index = button ? toolbarButtons().indexOf(button) : -1;
          if (index !== -1) setToolbarIndex(index);
        }}
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
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={editing ? "done" : "edit"}
                className="grid place-items-center"
                {...POP}
              >
                {editing ? <Check /> : <Pencil />}
              </motion.span>
            </AnimatePresence>
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
      {showClock && (
        <HeaderClock
          className="
            glass col-start-3 inline-flex flex-col items-end justify-center justify-self-end
            self-stretch rounded-lg px-3
          "
        />
      )}
    </header>
  );
}

function HeaderClock({ className }: { className?: string }) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const clockDate = useAppSettingsStore((s) => s.clockDate);
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, clockOptions(!clock24h)),
    [clock24h],
  );
  const now = useNow();

  const parts = formatter.formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value;
  const date = formatClockDate(now, clockDate);

  return (
    <span className={className}>
      <span className="text-ink text-heading font-semibold tracking-tight tabular-nums">
        {hour}
        <span className="mx-0.5">:</span>
        {minute}
        {dayPeriod ? <span className="text-ink-3 ml-1">{dayPeriod}</span> : null}
      </span>
      {date ? <span className="text-ink-3 text-caption leading-tight">{date}</span> : null}
    </span>
  );
}
