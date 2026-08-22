// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarEventItem } from "@/widgets/calendar/components/CalendarEventItem";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

const NOW = new Date("2026-08-04T09:00:00Z");

function event(overrides: Partial<DisplayCalendarEvent> = {}): DisplayCalendarEvent {
  return {
    id: "e1",
    calendarId: "cal-1",
    provider: "google",
    title: "Standup",
    startsAt: "2026-08-04T12:00:00Z",
    endsAt: "2026-08-04T12:15:00Z",
    isAllDay: false,
    visibility: "default",
    links: [],
    ...overrides,
  };
}

function renderItem(value: DisplayCalendarEvent) {
  return render(
    <TooltipProvider>
      <CalendarEventItem event={value} index={0} color="#888" now={NOW} reduced />
    </TooltipProvider>,
  );
}

describe("CalendarEventItem join action", () => {
  it("opens the join url in a new tab", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    renderItem(event({ joinUrl: "https://meet.google.com/abc" }));

    fireEvent.click(screen.getByLabelText("Join Standup"));

    expect(open).toHaveBeenCalledWith(
      "https://meet.google.com/abc",
      "_blank",
      "noopener,noreferrer",
    );
    open.mockRestore();
  });

  it("replaces the countdown with a pinned join button for an imminent meeting", () => {
    renderItem(
      event({
        startsAt: "2026-08-04T09:20:00Z",
        endsAt: "2026-08-04T09:50:00Z",
        joinUrl: "https://meet.google.com/abc",
      }),
    );

    expect(screen.getByLabelText("Join Standup")).toBeInTheDocument();
    expect(screen.queryByText(/^in /)).not.toBeInTheDocument();
  });

  it("does not pin the join button on a distant event just because it leads its group", () => {
    render(
      <TooltipProvider>
        <CalendarEventItem
          event={event({
            startsAt: "2026-08-04T17:00:00Z",
            endsAt: "2026-08-04T18:00:00Z",
            joinUrl: "https://meet.google.com/abc",
          })}
          index={0}
          color="#888"
          now={NOW}
          reduced
          emphasized
        />
      </TooltipProvider>,
    );

    expect(screen.getByLabelText("Join Standup")).toBeInTheDocument();
    expect(screen.getByText(/^in /)).toBeInTheDocument();
  });

  it("keeps the actions rendered and legible without hovering", () => {
    renderItem(event({ joinUrl: "https://meet.google.com/abc" }));

    const actions = screen.getByLabelText("Join Standup").closest("div");

    expect(actions?.className).not.toContain("opacity-0");
    expect(actions?.className).toContain("opacity-60");
  });

  it("keeps the countdown when an imminent event has no join url", () => {
    renderItem(event({ startsAt: "2026-08-04T09:20:00Z", endsAt: "2026-08-04T09:50:00Z" }));

    expect(screen.getByText(/^in /)).toBeInTheDocument();
  });
});
