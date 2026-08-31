import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  Check,
  MessageSquarePlus,
  Pencil,
  ScrollText,
  Search,
  Settings,
} from "lucide-react";
import { pop } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useRovingFocus } from "@/hooks/useRovingFocus";
import { ChangelogDialog, consumeChangelogAutoShow, useHasUnseenRelease } from "@/changelog";
import { GuideDialog, useGuideStore } from "@/guide";
import { HeaderClock } from "@/app/HeaderClock";
import { WidgetPalette } from "@/app/WidgetPalette";
import { useCommandPaletteStore } from "@/palette";
import { useSettingsStore } from "@/settings";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { FeedbackDialog } from "@/feedback";

const TOOLBAR_BUTTONS = 8;

export function Header() {
  const reduced = useReducedMotion();
  const editing = useDashboardStore((s) => s.editing);
  const toggleEditing = useDashboardStore((s) => s.toggleEditing);
  const openSettings = useSettingsStore((s) => s.openSettings);
  const hasUnseenRelease = useHasUnseenRelease();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const openGuide = useGuideStore((s) => s.openGuide);
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const showClock = useAppSettingsStore((s) => s.showClock);
  const toolbar = useRovingFocus({ count: TOOLBAR_BUTTONS });

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
        role="toolbar"
        aria-label="Dashboard actions"
        {...toolbar.containerProps}
        className="glass col-start-2 flex items-center gap-1 justify-self-center rounded-lg p-1"
      >
        <ThemeToggle {...toolbar.itemProps(0)} />
        <WidgetPalette {...toolbar.itemProps(1)} />
        <Tooltip content={editing ? "Done" : "Edit mode"} sticky>
          <Button
            {...toolbar.itemProps(2)}
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
                {...pop(reduced)}
              >
                {editing ? <Check /> : <Pencil />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </Tooltip>
        <Tooltip content="Search">
          <Button
            {...toolbar.itemProps(3)}
            variant="ghost"
            size="icon-lg"
            aria-label="Open the command palette"
            onClick={openPalette}
          >
            <Search />
          </Button>
        </Tooltip>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Tooltip content="Settings">
          <Button
            {...toolbar.itemProps(4)}
            variant="ghost"
            size="icon-lg"
            aria-label="Settings"
            onClick={() => openSettings()}
          >
            <Settings />
          </Button>
        </Tooltip>
        <Tooltip content="What's new">
          <Button
            {...toolbar.itemProps(5)}
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
            {...toolbar.itemProps(6)}
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
            {...toolbar.itemProps(7)}
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
