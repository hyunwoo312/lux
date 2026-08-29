import { motion } from "motion/react";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { EASE_OUT, DURATION, enterTween, stagger } from "@/lib/motion";
import { CalendarEventActions } from "@/widgets/calendar/components/CalendarEventActions";
import {
  formatEventRelativeTime,
  formatEventTime,
  getEventStartDate,
  getEventTitle,
} from "@/widgets/calendar/lib/agenda";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

type CalendarEventItemProps = {
  event: DisplayCalendarEvent;
  index: number;
  color: string;
  now: Date;
  emphasized?: boolean;
  timeLabel?: string;
  reduced: boolean | null;
  layoutId?: string;
};

export function CalendarEventItem({
  event,
  index,
  color,
  now,
  emphasized = false,
  timeLabel,
  reduced,
  layoutId,
}: CalendarEventItemProps) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const title = getEventTitle(event);
  const startsInMs = getEventStartDate(event).getTime() - now.getTime();
  const imminent = startsInMs >= 0 && startsInMs <= 60 * 60_000;
  const relative = emphasized || imminent ? formatEventRelativeTime(event, now) : null;
  const needsResponse = event.rsvp === "needsAction";
  const declined = event.rsvp === "declined";
  const pinActions = Boolean(event.joinUrl) && imminent;

  return (
    <motion.div
      layoutId={layoutId}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...enterTween(reduced, "fast"),
        delay: Math.min(index, 8) * stagger(reduced, "tight"),
        layout: { duration: reduced ? 0 : DURATION.slow, ease: EASE_OUT },
      }}
      className={cn(ROW.item, "group", declined && "opacity-50")}
    >
      <span
        aria-hidden
        className="size-2 flex-none rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-ink-3 w-12 flex-none text-micro font-semibold tabular-nums">
        {timeLabel ?? formatEventTime(event, !clock24h)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={cn("text-ink truncate text-body font-medium", declined && "line-through")}
          >
            {title}
          </span>
          {needsResponse && (
            <Tooltip content="Needs your response">
              <span
                role="img"
                aria-label="Needs your response"
                className="border-primary size-1.5 shrink-0 rounded-full border"
              />
            </Tooltip>
          )}
        </span>
        {event.location && <span className="text-ink-3 truncate text-micro">{event.location}</span>}
      </span>
      {relative && !pinActions && (
        <span className="text-primary flex-none text-micro font-semibold tabular-nums">
          {relative}
        </span>
      )}
      <CalendarEventActions
        event={event}
        title={title}
        reduced={reduced}
        size="md"
        className={cn(
          "transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100",
          pinActions ? "opacity-100" : "opacity-60",
        )}
      />
    </motion.div>
  );
}
