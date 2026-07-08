import { CalendarGrid } from "@/widgets/calendar/CalendarGrid";
import { CalendarListView } from "@/widgets/calendar/CalendarListView";
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
    sampleEvent("standup", "work", "Team standup", at(0, 9), at(0, 9, 30)),
    sampleEvent("lunch", "personal", "Lunch with Alex", at(0, 12, 30), at(0, 13, 30), "Cafe Nero"),
    sampleEvent("review", "work", "Design review", at(0, 15), at(0, 16)),
    sampleEvent("oneone", "work", "1:1 with Sam", at(1, 10), at(1, 10, 30)),
    sampleEvent("gym", "personal", "Gym session", at(1, 18), at(1, 19)),
    sampleEvent("dentist", "personal", "Dentist appointment", at(3, 11), at(3, 12)),
    sampleEvent("dinner", "social", "Dinner with friends", at(4, 19), at(4, 21)),
  ];
}

const SAMPLE_EVENTS = buildSampleEvents();

export function CalendarSignedOutPreview() {
  const view = useCalendar((d) => d.view);

  return view === "list" ? (
    <CalendarListView events={SAMPLE_EVENTS} colors={SAMPLE_COLORS} enabled status="idle" />
  ) : (
    <CalendarGrid events={SAMPLE_EVENTS} colors={SAMPLE_COLORS} />
  );
}
