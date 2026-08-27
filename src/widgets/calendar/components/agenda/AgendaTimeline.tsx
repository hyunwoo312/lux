import { useEffect, useRef, type Ref } from "react";
import { formatClock, formatHourMark } from "@/lib/clock";
import { ListGroupHeading } from "@/components/ListGroupHeading";
import { AgendaEventBlock } from "@/widgets/calendar/components/agenda/AgendaEventBlock";
import { AgendaSkipRow } from "@/widgets/calendar/components/agenda/AgendaSkipRow";
import { NowLine } from "@/widgets/calendar/components/agenda/NowLine";
import { getEventColor } from "@/widgets/calendar/lib/colors";
import { getDateKey } from "@/widgets/calendar/lib/dates";
import {
  formatDayHeading,
  formatGapLabel,
  formatSkipLabel,
  getEventCountdown,
  getEventUrgency,
  getHourMarks,
  getRunGaps,
  isTimelineRun,
  runHoldsNow,
  type TimelineRun,
  type TimelineSegment,
} from "@/widgets/calendar/lib/timeline";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

const GUTTER_PX = 44;
const MIN_BLOCK_PX = 24;
const GAP_LABEL_MIN_PX = 24;

type RunTrackProps = {
  run: TimelineRun<DisplayCalendarEvent>;
  colors: Map<string, string>;
  now: Date;
  hour12: boolean;
  pxPerMinute: number;
  reduced: boolean | null;
  holdsNow: boolean;
  isLast: boolean;
  nowRef: Ref<HTMLDivElement>;
};

function RunTrack({
  run,
  colors,
  now,
  hour12,
  pxPerMinute,
  reduced,
  holdsNow,
  isLast,
  nowRef,
}: RunTrackProps) {
  const gaps = getRunGaps(run, now).filter((gap) => !gap.trailing || (holdsNow && isLast));
  const nowPx = ((now.getTime() - run.start.getTime()) / 60_000) * pxPerMinute;

  return (
    <div className="relative mt-1.5" style={{ height: run.minutes * pxPerMinute }}>
      <div aria-hidden className="absolute inset-0">
        {getHourMarks(run).map((mark) => (
          <div
            key={mark.getTime()}
            style={{ top: ((mark.getTime() - run.start.getTime()) / 60_000) * pxPerMinute }}
            className="absolute inset-x-0 flex -translate-y-1/2 items-center gap-1"
          >
            <span
              className="
                text-ink-3 w-10 flex-none text-right text-micro whitespace-nowrap tabular-nums
              "
            >
              {formatHourMark(mark, hour12)}
            </span>
            <span className="bg-foreground/8 h-px flex-1" />
          </div>
        ))}
      </div>

      <div className="absolute inset-y-0 right-0" style={{ left: GUTTER_PX }}>
        {gaps.map((gap) => {
          const height = gap.minutes * pxPerMinute;
          return (
            <div
              key={`gap-${gap.startMin}`}
              style={{ top: gap.startMin * pxPerMinute, height }}
              className="
                border-border/50 text-ink-3 absolute inset-x-0 flex items-center justify-center
                rounded-md border border-dashed px-1
              "
            >
              {height >= GAP_LABEL_MIN_PX && (
                <span className="truncate text-micro font-medium">
                  {formatGapLabel(gap, run, hour12)}
                </span>
              )}
            </div>
          );
        })}

        <ol className="absolute inset-0" aria-label={`Events, ${formatDayHeading(run.day, now)}`}>
          {run.blocks.map((block, index) => {
            const top = Math.max(0, block.startMin * pxPerMinute);
            const height = Math.max(MIN_BLOCK_PX, block.endMin * pxPerMinute - top);
            return (
              <AgendaEventBlock
                key={block.event.id}
                event={block.event}
                color={getEventColor(block.event, colors)}
                urgency={getEventUrgency(block.event, now)}
                countdown={getEventCountdown(block.event, now)}
                conflicting={block.conflicting}
                hour12={hour12}
                index={index}
                reduced={reduced}
                top={top}
                height={height}
                left={(block.lane / block.laneCount) * 100}
                width={100 / block.laneCount}
              />
            );
          })}
        </ol>
      </div>

      {holdsNow && (
        <NowLine
          ref={nowRef}
          label={formatClock(now, hour12)}
          style={{ top: nowPx, left: GUTTER_PX - 6 }}
          className="absolute right-0 -translate-y-1/2"
        />
      )}
    </div>
  );
}

type AgendaTimelineProps = {
  segments: TimelineSegment<DisplayCalendarEvent>[];
  colors: Map<string, string>;
  now: Date;
  hour12: boolean;
  pxPerMinute: number;
  reduced: boolean | null;
};

export function AgendaTimeline({
  segments,
  colors,
  now,
  hour12,
  pxPerMinute,
  reduced,
}: AgendaTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const marker = nowRef.current;
    if (!container || !marker) return;
    const offset =
      marker.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTop = Math.max(0, offset - container.clientHeight / 3);
  }, []);

  const runs = segments.filter(isTimelineRun);
  const lastRun = runs[runs.length - 1];
  const spansDays = runs.some((run) => getDateKey(run.day) !== getDateKey(now));
  let previousDay: Date | null = null;

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-1.5">
      <ol className="flex flex-col pt-2 pb-6" aria-label="Agenda">
        {segments.map((segment) => {
          if (!isTimelineRun(segment)) {
            return (
              <AgendaSkipRow
                key={`skip-${segment.from.getTime()}`}
                label={formatSkipLabel(segment, now, hour12)}
                gutter={GUTTER_PX}
              />
            );
          }
          const heading = previousDay
            ? getDateKey(segment.day) !== getDateKey(previousDay)
            : spansDays;
          previousDay = segment.day;
          return (
            <li key={`run-${segment.start.getTime()}`}>
              {heading && (
                <ListGroupHeading label={formatDayHeading(segment.day, now)} gutter={GUTTER_PX} />
              )}
              <RunTrack
                run={segment}
                colors={colors}
                now={now}
                hour12={hour12}
                pxPerMinute={pxPerMinute}
                reduced={reduced}
                holdsNow={runHoldsNow(segment, now)}
                isLast={segment === lastRun}
                nowRef={nowRef}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
