// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MonthWeek } from "@/widgets/calendar/components/MonthWeek";
import { getEventsByDate } from "@/widgets/calendar/lib/agenda";
import { getMonthGridDays } from "@/widgets/calendar/lib/dates";
import { computeMonthLayout, getMonthMetrics } from "@/widgets/calendar/lib/month-layout";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { CalendarEvent } from "@/widgets/calendar/types";

const ID = "calendar-month";
const VISIBLE_MONTH = new Date(2026, 5, 1);
const DAYS = getMonthGridDays(VISIBLE_MONTH);

function timedEvent(id: string, index: number, hour: number): CalendarEvent {
  const start = new Date(DAYS[index]!);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 1, 0, 0, 0);
  return {
    id,
    calendarId: "c",
    title: id,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    isAllDay: false,
    visibility: "default",
  };
}

function renderWeek(events: CalendarEvent[], width: number, height: number) {
  const layout = computeMonthLayout(DAYS, events, VISIBLE_MONTH, "2026-5-15");
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <TooltipProvider>
        <MonthWeek
          week={layout.weeks[1]!}
          eventsByDate={getEventsByDate(events)}
          colors={new Map()}
          metrics={getMonthMetrics(width, height)}
        />
      </TooltipProvider>
    </WidgetInstanceContext.Provider>,
  );
}

const BUSY_DAY = [
  timedEvent("a", 10, 9),
  timedEvent("b", 10, 11),
  timedEvent("c", 10, 13),
  timedEvent("d", 10, 15),
];

beforeEach(() => {
  useCalendarStore.setState({ byInstance: {} });
});

describe("MonthWeek at small sizes", () => {
  it("counts the events it cannot show once there is room for a row", () => {
    renderWeek(BUSY_DAY, 358, 338);

    expect(screen.getByText("+3 more")).toBeInTheDocument();
  });
});
