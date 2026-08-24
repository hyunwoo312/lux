import { formatClock, formatHourMark } from "@/lib/clock";
import {
  formatEventRelativeTime,
  getEventDisplayEndDate,
  getEventStartDate,
  getEventTitle,
  isMultiDayEvent,
} from "@/widgets/calendar/lib/agenda";
import { addDays, endOfDay, getDateKey, startOfDay } from "@/widgets/calendar/lib/dates";
import type { CalendarEvent } from "@/widgets/calendar/types";

const MINUTE_MS = 60_000;

const MIN_WINDOW_HOURS = 3;
const MIN_GAP_MINUTES = 20;

export type TimelineSplit<T extends CalendarEvent> = { allDay: T[]; timed: T[] };

export type TimelineAxis = { start: Date; end: Date; minutes: number };

export type TimedBlock<T extends CalendarEvent> = {
  event: T;
  startMin: number;
  endMin: number;
  lane: number;
  laneCount: number;
  conflicting: boolean;
};

export type FreeGap = { startMin: number; endMin: number; minutes: number; trailing: boolean };

export type EventUrgency = "past" | "now" | "imminent" | "soon" | "later";

export function getWindowStart(now: Date): Date {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  return start;
}

function floorHour(date: Date): Date {
  const floored = new Date(date);
  floored.setMinutes(0, 0, 0);
  return floored;
}

function ceilHour(date: Date): Date {
  const next = new Date(date);
  if (next.getMinutes() || next.getSeconds() || next.getMilliseconds()) {
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
  }
  return next;
}

function byStartThenLongest(first: CalendarEvent, second: CalendarEvent): number {
  const startDiff = getEventStartDate(first).getTime() - getEventStartDate(second).getTime();
  if (startDiff !== 0) return startDiff;
  return getEventDisplayEndDate(second).getTime() - getEventDisplayEndDate(first).getTime();
}

export function getHourMarks(axis: TimelineAxis): Date[] {
  const marks: Date[] = [];
  for (
    let cursor = new Date(axis.start);
    cursor.getTime() <= axis.end.getTime();
    cursor.setHours(cursor.getHours() + 1)
  ) {
    marks.push(new Date(cursor));
  }
  return marks;
}

export function packEventLanes<T extends CalendarEvent>(
  events: T[],
  windowStart: Date,
): TimedBlock<T>[] {
  const base = windowStart.getTime();
  const items = events
    .map((event) => {
      const startMs = getEventStartDate(event).getTime();
      return { event, startMs, endMs: Math.max(startMs, getEventDisplayEndDate(event).getTime()) };
    })
    .sort((first, second) => first.startMs - second.startMs || second.endMs - first.endMs);

  const blocks: TimedBlock<T>[] = [];
  let cluster: typeof items = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const placed = cluster.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.startMs);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = item.endMs;
      return { item, lane };
    });

    for (const { item, lane } of placed) {
      blocks.push({
        event: item.event,
        startMin: (item.startMs - base) / MINUTE_MS,
        endMin: (item.endMs - base) / MINUTE_MS,
        lane,
        laneCount: laneEnds.length,
        conflicting: cluster.some(
          (other) => other !== item && other.startMs < item.endMs && item.startMs < other.endMs,
        ),
      });
    }
    cluster = [];
  };

  for (const item of items) {
    if (item.startMs >= clusterEnd) {
      flush();
      clusterEnd = item.endMs;
    } else {
      clusterEnd = Math.max(clusterEnd, item.endMs);
    }
    cluster.push(item);
  }
  flush();

  return blocks.sort(
    (first, second) => first.startMin - second.startMin || first.lane - second.lane,
  );
}

export function getFreeGaps(
  busy: Array<{ startMin: number; endMin: number }>,
  windowMinutes: number,
  fromMin: number,
): FreeGap[] {
  const merged: Array<{ startMin: number; endMin: number }> = [];
  for (const span of [...busy].sort((first, second) => first.startMin - second.startMin)) {
    const last = merged[merged.length - 1];
    if (last && span.startMin <= last.endMin) last.endMin = Math.max(last.endMin, span.endMin);
    else merged.push({ startMin: span.startMin, endMin: span.endMin });
  }

  const bounds: Array<{ startMin: number; endMin: number; trailing: boolean }> = [];
  let cursor = Math.max(0, fromMin);
  for (const span of merged) {
    if (span.endMin <= cursor) continue;
    if (span.startMin > cursor) {
      bounds.push({
        startMin: cursor,
        endMin: Math.min(span.startMin, windowMinutes),
        trailing: false,
      });
    }
    cursor = Math.max(cursor, span.endMin);
  }
  if (cursor < windowMinutes) {
    bounds.push({ startMin: cursor, endMin: windowMinutes, trailing: true });
  }

  return bounds
    .map((gap) => ({ ...gap, minutes: gap.endMin - gap.startMin }))
    .filter((gap) => gap.minutes >= MIN_GAP_MINUTES);
}

export function getEventUrgency(event: CalendarEvent, now: Date): EventUrgency {
  if (event.isAllDay) return "later";
  const nowMs = now.getTime();
  const startMs = getEventStartDate(event).getTime();
  const endMs = getEventDisplayEndDate(event).getTime();
  if (endMs <= nowMs) return "past";
  if (startMs <= nowMs) return "now";
  const minutes = (startMs - nowMs) / MINUTE_MS;
  if (minutes <= 15) return "imminent";
  if (minutes <= 60) return "soon";
  return "later";
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function formatTimeRange(event: CalendarEvent, hour12: boolean): string {
  const start = formatClock(getEventStartDate(event), hour12);
  const end = formatClock(getEventDisplayEndDate(event), hour12);
  return start === end ? start : `${start} – ${end}`;
}

export function formatGapLabel(gap: FreeGap, axis: TimelineAxis, hour12: boolean): string {
  if (gap.trailing) return `${formatDuration(gap.minutes)} free — nothing else today`;
  const until = new Date(axis.start.getTime() + gap.endMin * MINUTE_MS);
  return `${formatDuration(gap.minutes)} free until ${formatClock(until, hour12)}`;
}

export function describeNextAfterToday(
  events: CalendarEvent[],
  now: Date,
  hour12: boolean,
): string | null {
  const dayEnd = endOfDay(now).getTime();
  let next: CalendarEvent | null = null;
  for (const event of events) {
    const startMs = getEventStartDate(event).getTime();
    if (startMs <= dayEnd) continue;
    if (!next || startMs < getEventStartDate(next).getTime()) next = event;
  }
  if (!next) return null;

  const start = getEventStartDate(next);
  const withinWeek = start.getTime() - dayEnd <= 7 * 24 * 60 * MINUTE_MS;
  const day =
    getDateKey(start) === getDateKey(addDays(now, 1))
      ? "tomorrow"
      : new Intl.DateTimeFormat(
          undefined,
          withinWeek ? { weekday: "long" } : { month: "short", day: "numeric" },
        ).format(start);
  const when = next.isAllDay ? day : `${day} at ${formatClock(start, hour12)}`;
  return `Next up: ${getEventTitle(next)}, ${when}.`;
}

export function getEventCountdown(event: CalendarEvent, now: Date): string | null {
  const urgency = getEventUrgency(event, now);
  if (urgency === "now") return "now";
  if (urgency !== "imminent" && urgency !== "soon") return null;
  return formatEventRelativeTime(event, now);
}

const ELIDE_AFTER_MINUTES = 150;

export type TimelineRun<T extends CalendarEvent> = {
  kind: "run";
  start: Date;
  end: Date;
  minutes: number;
  blocks: TimedBlock<T>[];
  gaps: FreeGap[];
  day: Date;
};

export type TimelineSkip = {
  kind: "skip";
  from: Date;
  to: Date;
  minutes: number;
};

export type TimelineSegment<T extends CalendarEvent> = TimelineRun<T> | TimelineSkip;

function windowEnd(now: Date, lookaheadDays: number): Date {
  return endOfDay(addDays(now, Math.max(0, lookaheadDays - 1)));
}

export function getRangeStart(anchor: Date, now: Date): Date {
  return startOfDay(anchor).getTime() === startOfDay(now).getTime()
    ? getWindowStart(now)
    : startOfDay(anchor);
}

export function splitTimelineEvents<T extends CalendarEvent>(
  events: T[],
  rangeStart: Date,
  lookaheadDays: number,
): TimelineSplit<T> {
  const from = rangeStart.getTime();
  const until = windowEnd(rangeStart, lookaheadDays).getTime();
  const allDay: T[] = [];
  const timed: T[] = [];

  for (const event of events) {
    const start = getEventStartDate(event).getTime();
    const end = getEventDisplayEndDate(event).getTime();
    if (end < startOfDay(rangeStart).getTime() || start > until) continue;
    if (event.isAllDay || isMultiDayEvent(event)) {
      allDay.push(event);
      continue;
    }
    if (end <= from) continue;
    timed.push(event);
  }

  return { allDay: allDay.sort(byStartThenLongest), timed: timed.sort(byStartThenLongest) };
}

function makeRun<T extends CalendarEvent>(start: Date, end: Date, events: T[]): TimelineRun<T> {
  const minutes = Math.round((end.getTime() - start.getTime()) / MINUTE_MS);
  const blocks = packEventLanes(events, start);
  return {
    kind: "run",
    start,
    end,
    minutes,
    blocks,
    gaps: getFreeGaps(blocks, minutes, 0),
    day: startOfDay(start),
  };
}

export function buildTimeline<T extends CalendarEvent>(
  timed: T[],
  rangeStart: Date,
  now: Date,
): TimelineSegment<T>[] {
  const holdsNow = startOfDay(rangeStart).getTime() === startOfDay(now).getTime();
  const firstEvent = timed[0];
  const openingStart =
    holdsNow || !firstEvent
      ? rangeStart
      : new Date(
          Math.max(floorHour(getEventStartDate(firstEvent)).getTime(), rangeStart.getTime()),
        );
  const openingFloor = new Date(openingStart);
  openingFloor.setHours(openingFloor.getHours() + MIN_WINDOW_HOURS);

  if (timed.length === 0) {
    return [makeRun(openingStart, openingFloor, [])];
  }

  const segments: TimelineSegment<T>[] = [];
  let runStart = openingStart;
  let runEnd = openingFloor;
  let runEvents: T[] = [];

  const flush = () => {
    segments.push(makeRun(runStart, runEnd, runEvents));
  };

  for (const event of timed) {
    const start = new Date(Math.max(getEventStartDate(event).getTime(), openingStart.getTime()));
    const end = getEventDisplayEndDate(event);
    const sameDay = startOfDay(start).getTime() === startOfDay(runStart).getTime();
    const gapMinutes = (start.getTime() - runEnd.getTime()) / MINUTE_MS;

    if (!sameDay || gapMinutes > ELIDE_AFTER_MINUTES) {
      flush();
      const nextStart = new Date(start);
      nextStart.setMinutes(0, 0, 0);
      segments.push({
        kind: "skip",
        from: runEnd,
        to: nextStart,
        minutes: Math.round((nextStart.getTime() - runEnd.getTime()) / MINUTE_MS),
      });
      runStart = nextStart;
      runEnd = ceilHour(end);
      runEvents = [event];
      continue;
    }

    runEnd = new Date(Math.max(runEnd.getTime(), ceilHour(end).getTime()));
    runEvents.push(event);
  }

  flush();
  return segments;
}

export function formatSkipLabel(skip: TimelineSkip, now: Date, hour12: boolean): string {
  const time = formatClock(skip.to, hour12);
  if (startOfDay(skip.from).getTime() === startOfDay(skip.to).getTime()) {
    return `Nothing until ${time}`;
  }
  const days = Math.round(
    (startOfDay(skip.to).getTime() - startOfDay(now).getTime()) / (24 * 60 * MINUTE_MS),
  );
  if (days <= 0) return `Nothing until ${time}`;
  if (days === 1) return `Nothing until tomorrow, ${time}`;
  return `Nothing until ${new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(skip.to)}, ${time}`;
}

export function formatDayHeading(day: Date, now: Date): string {
  const days = Math.round(
    (startOfDay(day).getTime() - startOfDay(now).getTime()) / (24 * 60 * MINUTE_MS),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(day);
}

export function getTimelineDays(lookaheadDays: number): number {
  return Math.max(1, lookaheadDays);
}

export function isTimelineRun<T extends CalendarEvent>(
  segment: TimelineSegment<T>,
): segment is TimelineRun<T> {
  return segment.kind === "run";
}

export function runHoldsNow<T extends CalendarEvent>(run: TimelineRun<T>, now: Date): boolean {
  return now.getTime() >= run.start.getTime() && now.getTime() < run.end.getTime();
}

export function getRunGaps<T extends CalendarEvent>(run: TimelineRun<T>, now: Date): FreeGap[] {
  const fromMin = (now.getTime() - run.start.getTime()) / MINUTE_MS;
  if (fromMin <= 0) return run.gaps;
  return getFreeGaps(run.blocks, run.minutes, fromMin);
}

export { formatClock, formatHourMark };
