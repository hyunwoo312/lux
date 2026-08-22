// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AgendaView } from "@/widgets/calendar/AgendaView";
import { formatHourMark } from "@/widgets/calendar/lib/timeline";
import { useCalendarStore, type CalendarData } from "@/widgets/calendar/useCalendarStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { CalendarSyncStatus, DisplayCalendarEvent } from "@/widgets/calendar/types";

const elementSize = vi.hoisted(() => ({ width: 0 }));

vi.mock("@/hooks/useElementSize", () => ({
  useElementSize: () => [() => {}, { width: elementSize.width, height: 400 }],
}));

const ID = "calendar-today";
const NOW = new Date(2026, 7, 23, 9, 30, 0, 0);

function at(hour: number, minute = 0, dayOffset = 0): Date {
  const date = new Date(2026, 7, 23, hour, minute, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

function makeEvent(
  over: Partial<DisplayCalendarEvent> & { id: string; from: Date; to: Date },
): DisplayCalendarEvent {
  const { from, to, ...rest } = over;
  return {
    calendarId: "primary",
    title: rest.id,
    isAllDay: false,
    visibility: "default",
    links: [],
    ...rest,
    startsAt: from.toISOString(),
    endsAt: to.toISOString(),
  };
}

function renderAgenda(events: DisplayCalendarEvent[], status: CalendarSyncStatus = "idle") {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <TooltipProvider>
        <AgendaView events={events} colors={new Map([["primary", "#4285f4"]])} status={status} />
      </TooltipProvider>
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  useCalendarStore.setState({ byInstance: {} as Record<string, CalendarData> });
  elementSize.width = 0;
});

describe("AgendaView", () => {
  it("opens the axis at the current hour", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(11), to: at(12) })]);

    expect(screen.getByText(formatHourMark(at(9), true))).toBeTruthy();
    expect(screen.queryByText(formatHourMark(at(8), true))).toBeNull();
  });

  it("shows where the current time falls on the axis", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(11), to: at(12) })]);
    expect(screen.getByText(/^Current time/)).toBeTruthy();
  });

  it("keeps the now-line even when the day is fully booked", () => {
    renderAgenda([
      makeEvent({ id: "Focus", from: at(9), to: at(12) }),
      makeEvent({ id: "Review", from: at(12), to: at(13) }),
    ]);
    expect(screen.getByText(/^Current time/)).toBeTruthy();
  });

  it("elides a long empty stretch and says what it skipped", () => {
    renderAgenda([makeEvent({ id: "Retro", from: at(16), to: at(17) })]);
    expect(screen.getByText(/^Nothing until/)).toBeTruthy();
  });

  it("heads each day of the window once the axis runs past today", () => {
    renderAgenda([
      makeEvent({ id: "Standup", from: at(11), to: at(12) }),
      makeEvent({ id: "Retro", from: at(9, 0, 1), to: at(10, 0, 1) }),
    ]);

    expect(screen.getByRole("heading", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tomorrow" })).toBeTruthy();
    expect(screen.getByText(/Nothing until tomorrow/)).toBeTruthy();
  });

  it("draws the now-line only in the run that holds the current time", () => {
    renderAgenda([
      makeEvent({ id: "Standup", from: at(11), to: at(12) }),
      makeEvent({ id: "Retro", from: at(9, 0, 1), to: at(10, 0, 1) }),
    ]);
    expect(screen.getAllByText(/^Current time/)).toHaveLength(1);
  });

  it("leaves no day heading when the window never leaves today", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(11), to: at(12) })]);
    expect(screen.queryByRole("heading", { name: "Today" })).toBeNull();
  });

  it("reports a double-booking on both events", () => {
    renderAgenda([
      makeEvent({ id: "Standup", from: at(10), to: at(11) }),
      makeEvent({ id: "Interview", from: at(10, 30), to: at(11, 30) }),
    ]);

    const blocks = within(screen.getByRole("list", { name: /^Events/ })).getAllByRole("listitem");
    const overlapping = blocks.filter((block) =>
      block.textContent?.includes("overlaps another event"),
    );
    expect(overlapping).toHaveLength(2);
  });

  it("does not report sequential events as a conflict", () => {
    renderAgenda([
      makeEvent({ id: "Standup", from: at(10), to: at(11) }),
      makeEvent({ id: "Review", from: at(11), to: at(12) }),
    ]);
    expect(screen.queryByText(/overlaps another event/)).toBeNull();
  });

  it("labels the free time before the next event", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(12), to: at(13) })]);
    expect(screen.getByText(/2h 30m free until/)).toBeTruthy();
  });

  it("says when nothing else is scheduled after the last event", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(10), to: at(10, 30) })]);
    expect(screen.getByText(/nothing else today/)).toBeTruthy();
  });

  it("offers the join button without hovering", () => {
    renderAgenda([
      makeEvent({
        id: "Standup",
        from: at(11),
        to: at(12),
        joinUrl: "https://meet.example.com/standup",
      }),
    ]);
    expect(screen.getByRole("button", { name: "Join Standup" })).toBeTruthy();
  });

  it("counts down to an imminent event", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(9, 40), to: at(10) })]);
    expect(screen.getByText("in 10m")).toBeTruthy();
  });

  it("opens the event from its button rather than from the block itself", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderAgenda([
      makeEvent({
        id: "Standup",
        from: at(11),
        to: at(12),
        links: [{ provider: "google", sourceUrl: "https://calendar.google.com/standup" }],
      }),
    ]);

    expect(screen.queryByRole("link", { name: /Standup/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open Standup in Google Calendar" }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://calendar.google.com/standup",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("drops the location before the time when a block is short", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(11), to: at(11, 30), location: "Room 4" })]);

    expect(screen.getAllByText(/11:00/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Room 4")).toBeNull();
  });

  it("shows the location once a block is tall enough for a third line", () => {
    renderAgenda([makeEvent({ id: "Workshop", from: at(11), to: at(13), location: "Room 4" })]);
    expect(screen.getByText("Room 4")).toBeTruthy();
  });

  it("reports a sync in progress before any events have arrived", () => {
    renderAgenda([], "syncing");
    expect(screen.getByText("Syncing your calendar…")).toBeTruthy();
  });

  it("reports a failed sync before any events have arrived", () => {
    renderAgenda([], "error");
    expect(screen.getByText("Couldn't sync your calendar.")).toBeTruthy();
  });
});

describe("AgendaView pinned untimed block", () => {
  it("keeps all-day and multi-day events off the time axis", () => {
    renderAgenda([
      makeEvent({ id: "Offsite", from: at(0), to: at(0, 0, 1), isAllDay: true }),
      makeEvent({ id: "Migration", from: at(13), to: at(15, 0, 2) }),
      makeEvent({ id: "Standup", from: at(11), to: at(12) }),
    ]);

    const pinned = screen.getByRole("region", { name: "All-day and multi-day events" });
    expect(within(pinned).getByText("Offsite")).toBeTruthy();
    expect(within(pinned).getByText("Migration")).toBeTruthy();
    expect(within(pinned).queryByText("Standup")).toBeNull();
  });

  it("does not scroll away with the axis", () => {
    renderAgenda([
      makeEvent({ id: "Offsite", from: at(0), to: at(0, 0, 1), isAllDay: true }),
      makeEvent({ id: "Standup", from: at(11), to: at(12) }),
    ]);

    const pinned = screen.getByRole("region", { name: "All-day and multi-day events" });
    const axis = screen.getByRole("list", { name: "Agenda" });
    expect(axis.contains(pinned)).toBe(false);
  });

  it("keeps the date range trigger reachable", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(11), to: at(12) })]);
    expect(screen.getByRole("button", { name: "Change date range" })).toBeTruthy();
  });

  it("keeps the date range trigger when nothing untimed is scheduled", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(11), to: at(12) })]);

    expect(screen.getByRole("button", { name: "Change date range" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "All-day and multi-day events" })).toBeNull();
  });

  it("alternates untimed events across two rows", () => {
    renderAgenda([
      makeEvent({ id: "Offsite", from: at(0), to: at(0, 0, 1), isAllDay: true }),
      makeEvent({ id: "Sprint", from: at(0), to: at(0, 0, 1), isAllDay: true }),
      makeEvent({ id: "Holiday", from: at(0), to: at(0, 0, 1), isAllDay: true }),
    ]);

    const pinned = screen.getByRole("region", { name: "All-day and multi-day events" });
    const rows = within(pinned)
      .getAllByRole("listitem")
      .filter((item) => item.querySelector("ul"));

    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getAllByRole("listitem")).toHaveLength(2);
    expect(within(rows[1] as HTMLElement).getAllByRole("listitem")).toHaveLength(1);
  });

  it("keeps every untimed event reachable by scrolling rather than dropping any", () => {
    renderAgenda(
      Array.from({ length: 9 }, (_, index) =>
        makeEvent({ id: `Untimed ${index}`, from: at(0), to: at(0, 0, 1), isAllDay: true }),
      ),
    );

    const pinned = screen.getByRole("region", { name: "All-day and multi-day events" });
    const chips = within(pinned)
      .getAllByRole("listitem")
      .filter((item) => !item.querySelector("ul"));

    expect(chips).toHaveLength(9);
  });

  it("offers join and open actions on an untimed event", () => {
    renderAgenda([
      makeEvent({
        id: "Offsite",
        from: at(0),
        to: at(0, 0, 1),
        isAllDay: true,
        joinUrl: "https://meet.example.com/offsite",
        links: [{ provider: "google", sourceUrl: "https://calendar.google.com/offsite" }],
      }),
    ]);

    const pinned = screen.getByRole("region", { name: "All-day and multi-day events" });
    expect(within(pinned).getByRole("button", { name: "Join Offsite" })).toBeTruthy();
    expect(
      within(pinned).getByRole("button", { name: "Open Offsite in Google Calendar" }),
    ).toBeTruthy();
  });

  it("clamps a long title rather than letting the row stretch", () => {
    renderAgenda([
      makeEvent({
        id: "A very long all day event title indeed",
        from: at(0),
        to: at(0, 0, 1),
        isAllDay: true,
      }),
    ]);

    const pinned = screen.getByRole("region", { name: "All-day and multi-day events" });
    const clamped = within(pinned).getByText(/…$/).textContent ?? "";

    expect(clamped.length).toBeLessThanOrEqual(21);
    expect(clamped).toBe("A very long all day…");
  });
});

describe("AgendaView when nothing is timed", () => {
  it("reads an empty window as a good outcome", () => {
    renderAgenda([]);
    expect(screen.getByText("Nothing scheduled in the next 7 days.")).toBeTruthy();
  });

  it("names the next event beyond the window", () => {
    renderAgenda([makeEvent({ id: "Retro", from: at(9, 0, 20), to: at(10, 0, 20) })]);
    expect(screen.getByText(/Next up: Retro/)).toBeTruthy();
  });

  it("distinguishes an untimed-only window from an empty one", () => {
    renderAgenda([makeEvent({ id: "Offsite", from: at(0), to: at(0, 0, 1), isAllDay: true })]);
    expect(screen.getByText("Nothing timed in the next 7 days.")).toBeTruthy();
  });

  it("acknowledges a today-only window whose events have all finished", () => {
    useCalendarStore.getState().setLookaheadDays(ID, 1);
    renderAgenda([makeEvent({ id: "Standup", from: at(7), to: at(8) })]);
    expect(screen.getByText("That's everything for today.")).toBeTruthy();
  });
});

describe("AgendaView at the narrowest widget size", () => {
  it("still opens an event only from its button, never from the row", () => {
    elementSize.width = 258;
    renderAgenda([
      makeEvent({
        id: "Standup",
        from: at(11),
        to: at(12),
        links: [{ provider: "google", sourceUrl: "https://calendar.google.com/standup" }],
      }),
    ]);

    expect(screen.queryByRole("link", { name: /Standup/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Open Standup in Google Calendar" })).toBeTruthy();
  });

  beforeEach(() => {
    elementSize.width = 258;
  });

  it("keeps the now-line when the time axis is dropped", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(11), to: at(12) })]);
    expect(screen.getByText(/^Current time/)).toBeTruthy();
  });

  it("keeps skips and day headings readable", () => {
    renderAgenda([
      makeEvent({ id: "Standup", from: at(11), to: at(12) }),
      makeEvent({ id: "Retro", from: at(9, 0, 1), to: at(10, 0, 1) }),
    ]);

    expect(screen.getByText(/Nothing until tomorrow/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tomorrow" })).toBeTruthy();
    expect(screen.getAllByText(/^Current time/)).toHaveLength(1);
  });

  it("still labels free time and keeps the join button reachable", () => {
    renderAgenda([
      makeEvent({
        id: "Standup",
        from: at(12),
        to: at(13),
        joinUrl: "https://meet.example.com/standup",
      }),
    ]);

    expect(screen.getByText(/2h 30m free until/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Join Standup" })).toBeTruthy();
  });

  it("still reports a double-booking", () => {
    renderAgenda([
      makeEvent({ id: "Standup", from: at(10), to: at(11) }),
      makeEvent({ id: "Interview", from: at(10, 30), to: at(11, 30) }),
    ]);

    const overlapping = screen
      .getAllByRole("listitem")
      .filter((item) => item.textContent?.includes("overlaps another event"));
    expect(overlapping).toHaveLength(2);
  });
});
