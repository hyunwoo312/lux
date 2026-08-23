import { useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarClock, CloudOff, Sunrise } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { useElementSize } from "@/hooks/useElementSize";
import { useNow } from "@/hooks/useNow";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { AgendaCompactList } from "@/widgets/calendar/components/agenda/AgendaCompactList";
import { AgendaTimeline } from "@/widgets/calendar/components/agenda/AgendaTimeline";
import { AgendaUntimedBlock } from "@/widgets/calendar/components/agenda/AgendaUntimedBlock";
import { getEventStartDate } from "@/widgets/calendar/lib/agenda";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { endOfDay, getDateKey, getRangeEndDate, startOfDay } from "@/widgets/calendar/lib/dates";
import {
  buildTimeline,
  describeNextAfterToday,
  getTimelineDays,
  getRangeStart,
  splitTimelineEvents,
} from "@/widgets/calendar/lib/timeline";
import { useCalendar } from "@/widgets/calendar/useCalendarStore";
import type { CalendarSyncStatus, DisplayCalendarEvent } from "@/widgets/calendar/types";

const TIMELINE_MIN_WIDTH = 300;
const HOUR_PX = { comfortable: 60, compact: 44 } as const;

type AgendaViewProps = {
  events: DisplayCalendarEvent[];
  colors: Map<string, string>;
  status: CalendarSyncStatus;
};

export function AgendaView({ events, colors, status }: AgendaViewProps) {
  const reduced = useReducedMotion();
  const now = useNow();
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const density = useCalendar((d) => d.density);
  const lookaheadDays = useCalendar((d) => d.lookaheadDays);
  const listAnchor = useCalendar((d) => d.listAnchor);
  const [ref, size] = useElementSize<HTMLDivElement>();
  const hour12 = !clock24h;
  const days = getTimelineDays(lookaheadDays);
  const rangeStart = useMemo(() => getRangeStart(listAnchor, now), [listAnchor, now]);

  const { allDay, timed } = useMemo(
    () => splitTimelineEvents(events, rangeStart, days),
    [events, rangeStart, days],
  );
  const segments = useMemo(() => buildTimeline(timed, rangeStart, now), [timed, rangeStart, now]);
  const nextLater = useMemo(() => {
    const until = endOfDay(getRangeEndDate(rangeStart, days)).getTime();
    const beyond = events.filter((event) => getEventStartDate(event).getTime() > until);
    return describeNextAfterToday(beyond, rangeStart, hour12);
  }, [events, rangeStart, days, hour12]);
  const hadEventsInRange = useMemo(() => {
    const from = startOfDay(rangeStart).getTime();
    const until = endOfDay(getRangeEndDate(rangeStart, days)).getTime();
    return events.some((event) => {
      const start = getEventStartDate(event).getTime();
      return start >= from && start <= until;
    });
  }, [events, rangeStart, days]);

  const compact = size.width > 0 && size.width < TIMELINE_MIN_WIDTH;
  const anchorKey = getDateKey(rangeStart);
  const direction = useTravelDirection(anchorKey, rangeStart.getTime());
  const shift = reduced ? 0 : 14;

  return (
    <div ref={ref} className="flex h-full min-h-0 flex-col gap-2 pt-0.5">
      <AgendaUntimedBlock events={allDay} colors={colors} compact={compact} anchorKey={anchorKey} />
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={anchorKey}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, x: direction * shift }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * shift }}
          transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
        >
          {timed.length === 0 ? (
            <EmptyAgenda
              events={events}
              status={status}
              days={days}
              hadEventsInRange={hadEventsInRange}
              hasUntimed={allDay.length > 0}
              nextLater={nextLater}
            />
          ) : compact ? (
            <AgendaCompactList
              segments={segments}
              colors={colors}
              now={now}
              hour12={hour12}
              reduced={reduced}
            />
          ) : (
            <AgendaTimeline
              segments={segments}
              colors={colors}
              now={now}
              hour12={hour12}
              pxPerMinute={HOUR_PX[density] / 60}
              reduced={reduced}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function useTravelDirection(key: string, time: number): number {
  const seen = useRef({ key, time, direction: 1 });
  if (seen.current.key !== key) {
    seen.current = { key, time, direction: time >= seen.current.time ? 1 : -1 };
  }
  return seen.current.direction;
}

type EmptyAgendaProps = {
  events: DisplayCalendarEvent[];
  status: CalendarSyncStatus;
  days: number;
  hadEventsInRange: boolean;
  hasUntimed: boolean;
  nextLater: string | null;
};

function emptyHeadline(days: number, hadEventsInRange: boolean, hasUntimed: boolean): string {
  const scope = days <= 1 ? "today" : `in the next ${days} days`;
  if (days <= 1 && hadEventsInRange) return "That's everything for today.";
  if (hasUntimed) return `Nothing timed ${scope}.`;
  return `Nothing scheduled ${scope}.`;
}

function EmptyAgenda({
  events,
  status,
  days,
  hadEventsInRange,
  hasUntimed,
  nextLater,
}: EmptyAgendaProps) {
  if (events.length === 0 && status === "syncing") {
    return <StateMessage icon={CalendarClock} message="Syncing your calendar…" />;
  }
  if (events.length === 0 && status === "error") {
    return <StateMessage icon={CloudOff} message="Couldn't sync your calendar." />;
  }

  return (
    <StateMessage
      icon={Sunrise}
      message={
        <>
          <span className="text-ink-2 block font-medium">
            {emptyHeadline(days, hadEventsInRange, hasUntimed)}
          </span>
          {nextLater && <span className="text-ink-4 mt-1 block text-caption">{nextLater}</span>}
        </>
      }
    />
  );
}
