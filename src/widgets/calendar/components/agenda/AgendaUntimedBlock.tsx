import { useState, type WheelEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { CalendarEventActions } from "@/widgets/calendar/components/CalendarEventActions";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { TodayButton } from "@/widgets/calendar/components/CalendarNavButton";
import { CalendarRangePicker } from "@/widgets/calendar/components/CalendarRangePicker";
import { formatEventDateRange, getEventTitle } from "@/widgets/calendar/lib/agenda";
import { getEventColor } from "@/widgets/calendar/lib/colors";
import { formatDayRange, getRangeEndDate } from "@/widgets/calendar/lib/dates";
import { useCalendar } from "@/widgets/calendar/useCalendarStore";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

const ROW_COUNT = 2;
const TITLE_MAX_CHARS = 20;

const ACTION_PADDING: Record<number, string | undefined> = {
  0: undefined,
  1: "group-hover/untimed:pr-7 group-focus-within/untimed:pr-7",
  2: "group-hover/untimed:pr-12 group-focus-within/untimed:pr-12",
  3: "group-hover/untimed:pr-16 group-focus-within/untimed:pr-16",
};

function RangeTrigger() {
  const [open, setOpen] = useState(false);
  const listAnchor = useCalendar((d) => d.listAnchor);
  const lookaheadDays = useCalendar((d) => d.lookaheadDays);
  const rangeEnd = getRangeEndDate(listAnchor, lookaheadDays);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content="Change date range">
        <PopoverTrigger
          aria-label="Change date range"
          className="
            press focus-ring text-ink
            hover:bg-foreground/5
            flex h-6 flex-none cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-caption
            font-semibold transition-colors
            [&_svg]:size-3.5
          "
        >
          <CalendarRange className="text-ink-3" />
          {formatDayRange(listAnchor, rangeEnd)}
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="start" padding="none" className="w-auto">
        <CalendarRangePicker onSelect={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

type UntimedItemProps = {
  event: DisplayCalendarEvent;
  color: string;
  index: number;
  reduced: boolean | null;
};

function clampTitle(title: string): string {
  return title.length > TITLE_MAX_CHARS ? `${title.slice(0, TITLE_MAX_CHARS).trimEnd()}…` : title;
}

function UntimedItem({ event, color, index, reduced }: UntimedItemProps) {
  const title = getEventTitle(event);
  const range = formatEventDateRange(event);
  const actionCount = (event.joinUrl ? 1 : 0) + event.links.filter((link) => link.sourceUrl).length;
  const actionPadding = ACTION_PADDING[actionCount];

  return (
    <motion.div
      className="group/untimed relative flex-none"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : DURATION.fast,
        delay: reduced ? 0 : Math.min(index, 6) * 0.03,
        ease: EASE_OUT,
      }}
    >
      <Tooltip prose content={`${title} · ${range}`}>
        <span
          className={cn(
            `
              border-border/60 text-ink-2 flex h-7 max-w-36 items-center gap-1.5 rounded-sm border
              px-1.5 text-micro font-medium
            `,
            event.rsvp === "declined" && "opacity-60",
          )}
        >
          <span
            aria-hidden
            className="size-1.5 flex-none rounded-full"
            style={{ backgroundColor: color }}
          />
          <span
            aria-hidden
            className={cn("truncate transition-[padding] duration-200", actionPadding)}
          >
            {clampTitle(title)}
          </span>
          <span className="sr-only">
            {title}, {event.isAllDay ? "all day" : "multi-day"}, {range}
          </span>
        </span>
      </Tooltip>
      {actionCount > 0 && (
        <span
          className="
            absolute top-1/2 right-1 flex -translate-y-1/2 translate-x-2 items-center gap-0.5
            opacity-0 transition duration-200
            group-hover/untimed:translate-x-0 group-hover/untimed:opacity-100
            group-focus-within/untimed:translate-x-0 group-focus-within/untimed:opacity-100
          "
        >
          <CalendarEventActions event={event} title={title} reduced={reduced} size="sm" />
        </span>
      )}
    </motion.div>
  );
}

type AgendaUntimedBlockProps = {
  events: DisplayCalendarEvent[];
  colors: Map<string, string>;
  compact: boolean;
  anchorKey: string;
};

function scrollHorizontally(event: WheelEvent<HTMLDivElement>) {
  const track = event.currentTarget;
  if (event.deltaX !== 0 || track.scrollWidth <= track.clientWidth) return;
  track.scrollLeft += event.deltaY;
}

export function AgendaUntimedBlock({
  events,
  colors,
  compact,
  anchorKey,
}: AgendaUntimedBlockProps) {
  const reduced = useReducedMotion();
  const rows = [0, 1]
    .map((row) => events.filter((_, index) => index % ROW_COUNT === row))
    .filter((row) => row.length > 0);

  return (
    <div
      className={cn(
        "flex flex-none gap-1.5 px-1.5",
        compact ? "flex-col items-stretch" : "items-center",
      )}
    >
      <span className="flex flex-none items-center gap-0.5">
        <RangeTrigger />
        <TodayButton />
      </span>
      {rows.length > 0 && !compact && (
        <span aria-hidden className="bg-border/60 my-1 w-px flex-none self-stretch" />
      )}
      {rows.length > 0 && (
        <section aria-label="All-day and multi-day events" className="min-w-0 flex-1">
          <div
            onWheel={scrollHorizontally}
            className="-mx-1.5 overflow-x-auto overscroll-x-contain px-1.5 py-1"
          >
            <ul key={anchorKey} className="flex w-max min-w-full flex-col gap-1">
              {rows.map((row, index) => (
                <li key={index}>
                  <ul className="flex items-center gap-1">
                    {row.map((event, position) => (
                      <li key={event.id} className="flex-none">
                        <UntimedItem
                          event={event}
                          color={getEventColor(event, colors)}
                          index={index + position * ROW_COUNT}
                          reduced={reduced}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
