// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AgendaView } from "@/widgets/calendar/AgendaView";
import { useCalendarStore, type CalendarData } from "@/widgets/calendar/useCalendarStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { CalendarSyncStatus, DisplayCalendarEvent } from "@/widgets/calendar/types";

const elementSize = vi.hoisted(() => ({ width: 0 }));

vi.mock("@/hooks/useElementSize", () => ({
  useElementSize: () => [() => {}, { width: elementSize.width, height: 400 }],
}));

const ID = "calendar-today";
// The store's DEFAULT_DATA captures listAnchor at module import, before setSystemTime can run,
// so the fake clock has to sit on the real date or the anchor and "now" fall on different days.
const NOW = (() => {
  const at = new Date();
  at.setHours(9, 30, 0, 0);
  return at;
})();

function at(hour: number, minute = 0, dayOffset = 0): Date {
  const date = new Date(NOW);
  date.setHours(hour, minute, 0, 0);
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
  it("keeps the now-line even when the day is fully booked", () => {
    renderAgenda([
      makeEvent({ id: "Focus", from: at(9), to: at(12) }),
      makeEvent({ id: "Review", from: at(12), to: at(13) }),
    ]);
    expect(screen.getByText(/^Current time/)).toBeTruthy();
  });

  it("draws the now-line only in the run that holds the current time", () => {
    renderAgenda([
      makeEvent({ id: "Standup", from: at(11), to: at(12) }),
      makeEvent({ id: "Retro", from: at(9, 0, 1), to: at(10, 0, 1) }),
    ]);
    expect(screen.getAllByText(/^Current time/)).toHaveLength(1);
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

  it("reports a failed sync before any events have arrived", () => {
    renderAgenda([], "error");
    expect(screen.getByText("Couldn't sync your calendar.")).toBeTruthy();
  });
});

describe("AgendaView pinned untimed block", () => {
  it("keeps the date range trigger when nothing untimed is scheduled", () => {
    renderAgenda([makeEvent({ id: "Standup", from: at(11), to: at(12) })]);

    expect(screen.getByRole("button", { name: "Change date range" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "All-day and multi-day events" })).toBeNull();
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
});

describe("AgendaView when nothing is timed", () => {
  it("distinguishes an untimed-only window from an empty one", () => {
    renderAgenda([makeEvent({ id: "Offsite", from: at(0), to: at(0, 0, 1), isAllDay: true })]);
    expect(screen.getByText("Nothing timed in the next 7 days.")).toBeTruthy();
  });
});
