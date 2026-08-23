import { useMemo } from "react";
import { CalendarGrid } from "@/widgets/calendar/CalendarGrid";
import { AgendaView } from "@/widgets/calendar/AgendaView";
import { useCalendar } from "@/widgets/calendar/useCalendarStore";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

const SAMPLE_COLORS = new Map<string, string>([
  ["work", "#3b82f6"],
  ["personal", "#22c55e"],
  ["social", "#f59e0b"],
]);

function at(dayOffset: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function soon(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

function sampleEvent(
  id: string,
  calendarId: string,
  title: string,
  startsAt: string,
  endsAt: string,
  location?: string,
): DisplayCalendarEvent {
  return {
    id,
    calendarId,
    title,
    startsAt,
    endsAt,
    location,
    isAllDay: false,
    visibility: "default",
    links: [],
  };
}

function buildSampleEvents(): DisplayCalendarEvent[] {
  return [
    {
      ...sampleEvent("offsite", "social", "Quarterly offsite", at(0, 0), at(1, 0)),
      isAllDay: true,
    },
    { ...sampleEvent("trip", "personal", "Lisbon trip", at(1, 0), at(4, 0)), isAllDay: true },
    sampleEvent("standup", "work", "Team standup", soon(25), soon(55)),
    sampleEvent("lunch", "personal", "Lunch with Alex", soon(95), soon(155), "Cafe Nero"),
    sampleEvent("review", "work", "Design review", soon(120), soon(180)),
    sampleEvent("oneone", "work", "1:1 with Sam", at(1, 10), at(1, 10, 30)),
    sampleEvent("gym", "personal", "Gym session", at(1, 18), at(1, 19)),
    sampleEvent("dentist", "personal", "Dentist appointment", at(3, 11), at(3, 12)),
    sampleEvent("dinner", "social", "Dinner with friends", at(4, 19), at(4, 21)),
  ];
}

export function CalendarSignedOutPreview() {
  const view = useCalendar((d) => d.view);
  const events = useMemo(buildSampleEvents, []);

  if (view === "calendar") {
    return <CalendarGrid events={events} colors={SAMPLE_COLORS} />;
  }
  return <AgendaView events={events} colors={SAMPLE_COLORS} status="idle" />;
}
