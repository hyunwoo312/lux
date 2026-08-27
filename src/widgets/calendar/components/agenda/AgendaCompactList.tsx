import type { ReactNode } from "react";
import { motion } from "motion/react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/clock";
import { EASE_OUT } from "@/lib/motion";
import { ListGroupHeading } from "@/components/ListGroupHeading";
import { CalendarEventActions } from "@/widgets/calendar/components/CalendarEventActions";
import { AgendaSkipRow } from "@/widgets/calendar/components/agenda/AgendaSkipRow";
import { NowLine } from "@/widgets/calendar/components/agenda/NowLine";
import { getEventTitle } from "@/widgets/calendar/lib/agenda";
import { getEventColor } from "@/widgets/calendar/lib/colors";
import { getDateKey } from "@/widgets/calendar/lib/dates";
import {
  formatDayHeading,
  formatGapLabel,
  formatSkipLabel,
  formatTimeRange,
  getEventCountdown,
  getEventUrgency,
  getRunGaps,
  isTimelineRun,
  runHoldsNow,
  URGENCY_RING,
  type FreeGap,
  type TimedBlock,
  type TimelineRun,
  type TimelineSegment,
} from "@/widgets/calendar/lib/timeline";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

type CompactRowProps = {
  block: TimedBlock<DisplayCalendarEvent>;
  color: string;
  now: Date;
  hour12: boolean;
  index: number;
  reduced: boolean | null;
};

function CompactRow({ block, color, now, hour12, index, reduced }: CompactRowProps) {
  const { event, conflicting } = block;
  const title = getEventTitle(event);
  const urgency = getEventUrgency(event, now);
  const countdown = getEventCountdown(event, now);
  const declined = event.rsvp === "declined";

  const content = (
    <>
      <span
        aria-hidden
        className="size-2 flex-none rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-ink-3 w-11 flex-none text-micro font-semibold tabular-nums">
        {formatClock(new Date(event.startsAt), hour12)}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1">
        {conflicting && <TriangleAlert className="text-ink-3 size-3 flex-none" aria-hidden />}
        <span
          className={cn("text-ink truncate text-micro font-medium", declined && "line-through")}
        >
          {title}
        </span>
      </span>
      <span className="sr-only">
        {formatTimeRange(event, hour12)}
        {conflicting ? ", overlaps another event" : ""}
        {declined ? ", declined" : ""}
      </span>
    </>
  );

  const row = cn(
    "flex min-w-0 items-center gap-2 rounded-md py-1 pl-1.5",
    declined && "opacity-60",
  );

  return (
    <motion.li
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.16,
        delay: reduced ? 0 : Math.min(index, 8) * 0.02,
        ease: EASE_OUT,
      }}
      className={cn("relative rounded-md", URGENCY_RING[urgency])}
    >
      <span className={cn(row, "pr-20")}>{content}</span>
      <span className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
        {countdown && (
          <span
            className="
              bg-primary text-primary-foreground rounded-sm px-1 text-micro font-semibold
              tabular-nums
            "
          >
            {countdown}
          </span>
        )}
        <CalendarEventActions event={event} title={title} reduced={reduced} size="sm" />
      </span>
    </motion.li>
  );
}

type Entry =
  | { kind: "event"; startMin: number; block: TimedBlock<DisplayCalendarEvent> }
  | { kind: "gap"; startMin: number; gap: FreeGap };

type RunRowsOptions = {
  run: TimelineRun<DisplayCalendarEvent>;
  colors: Map<string, string>;
  now: Date;
  hour12: boolean;
  reduced: boolean | null;
  isLast: boolean;
};

function renderRunRows({ run, colors, now, hour12, reduced, isLast }: RunRowsOptions): ReactNode[] {
  const holdsNow = runHoldsNow(run, now);
  const gaps = getRunGaps(run, now).filter((gap) => !gap.trailing || (holdsNow && isLast));
  const entries: Entry[] = [
    ...run.blocks.map<Entry>((block) => ({ kind: "event", startMin: block.startMin, block })),
    ...gaps.map<Entry>((gap) => ({ kind: "gap", startMin: gap.startMin, gap })),
  ].sort((first, second) => first.startMin - second.startMin);

  const nowMin = (now.getTime() - run.start.getTime()) / 60_000;
  const found = entries.findIndex((entry) => entry.startMin > nowMin);
  const nowAt = holdsNow ? (found === -1 ? entries.length : found) : -1;

  const nowLine = (
    <li key={`now-${run.start.getTime()}`}>
      <NowLine label={formatClock(now, hour12)} className="my-1" />
    </li>
  );

  const rows: ReactNode[] = [];
  entries.forEach((entry, index) => {
    if (index === nowAt) rows.push(nowLine);
    if (entry.kind === "gap") {
      rows.push(
        <li
          key={`gap-${run.start.getTime()}-${entry.startMin}`}
          className="
            border-border/50 text-ink-3 my-0.5 rounded-md border border-dashed px-2 py-1 text-micro
            font-medium
          "
        >
          {formatGapLabel(entry.gap, run, hour12)}
        </li>,
      );
      return;
    }
    rows.push(
      <CompactRow
        key={entry.block.event.id}
        block={entry.block}
        color={getEventColor(entry.block.event, colors)}
        now={now}
        hour12={hour12}
        index={index}
        reduced={reduced}
      />,
    );
  });
  if (nowAt === entries.length) rows.push(nowLine);

  return rows;
}

type AgendaCompactListProps = {
  segments: TimelineSegment<DisplayCalendarEvent>[];
  colors: Map<string, string>;
  now: Date;
  hour12: boolean;
  reduced: boolean | null;
};

const COMPACT_GUTTER_PX = 52;

export function AgendaCompactList({
  segments,
  colors,
  now,
  hour12,
  reduced,
}: AgendaCompactListProps) {
  const runs = segments.filter(isTimelineRun);
  const lastRun = runs[runs.length - 1];
  const spansDays = runs.some((run) => getDateKey(run.day) !== getDateKey(now));
  const rows: ReactNode[] = [];
  let previousDay: Date | null = null;

  for (const segment of segments) {
    if (!isTimelineRun(segment)) {
      rows.push(
        <AgendaSkipRow
          key={`skip-${segment.from.getTime()}`}
          label={formatSkipLabel(segment, now, hour12)}
          gutter={COMPACT_GUTTER_PX}
        />,
      );
      continue;
    }
    const heading = previousDay ? getDateKey(segment.day) !== getDateKey(previousDay) : spansDays;
    previousDay = segment.day;
    if (heading) {
      rows.push(
        <li key={`day-${segment.start.getTime()}`}>
          <ListGroupHeading label={formatDayHeading(segment.day, now)} gutter={COMPACT_GUTTER_PX} />
        </li>,
      );
    }
    rows.push(
      ...renderRunRows({
        run: segment,
        colors,
        now,
        hour12,
        reduced,
        isLast: segment === lastRun,
      }),
    );
  }

  return (
    <div className="scroll-fade min-h-0 flex-1 overflow-y-auto px-1.5 py-1">
      <ol className="flex flex-col gap-0.5" aria-label="Agenda">
        {rows}
      </ol>
    </div>
  );
}
