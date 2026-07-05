// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { CalendarWidget } from "@/widgets/calendar/CalendarWidget";
import { useCalendarStore, type CalendarData } from "@/widgets/calendar/useCalendarStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { CalendarEvent } from "@/widgets/calendar/types";

const ID = "calendar-1";

function baseData(over: Partial<CalendarData> = {}): CalendarData {
  const now = new Date();
  return {
    events: [],
    lookaheadDays: 7,
    enabled: true,
    view: "calendar",
    google: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] },
    microsoft: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] },
    primarySource: "google",
    refreshIntervalHours: 6,
    status: "idle",
    syncing: [],
    resyncPending: [],
    visibleMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    mode: "month",
    selectedDay: null,
    focusRowIndex: 0,
    listAnchor: now,
    ...over,
  };
}

function patch(over: Partial<CalendarData>) {
  useCalendarStore.setState((state) => ({
    byInstance: { ...state.byInstance, [ID]: { ...(state.byInstance[ID] ?? baseData()), ...over } },
  }));
}

function renderWidget() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <TooltipProvider>
        <CalendarWidget />
      </TooltipProvider>
    </WidgetInstanceContext.Provider>,
  );
}

function connectAccount() {
  useIntegrationStore.setState({
    accounts: [
      {
        id: "google-1",
        providerId: "google",
        providerAccountId: "1",
        displayName: "Ada",
        status: "connected",
        connectedAt: "2026-06-20T00:00:00.000Z",
      },
    ],
    loaded: true,
  });
}

function timedEvent(): CalendarEvent {
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(10, 0, 0, 0);
  return {
    id: "google-primary-standup",
    calendarId: "primary",
    title: "Standup",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    sourceUrl: "https://calendar.google.com/standup",
    isAllDay: false,
    visibility: "default",
  };
}

function multiDayEvent(): CalendarEvent {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return {
    id: "google-primary-trip",
    calendarId: "primary",
    title: "Team Trip",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    isAllDay: true,
    visibility: "default",
  };
}

beforeEach(() => {
  useIntegrationStore.setState({ accounts: [], loaded: true });
  useCalendarStore.setState({ byInstance: { [ID]: baseData() } });
});

describe("CalendarWidget", () => {
  it("shows a connect call to action when no account is linked", () => {
    renderWidget();
    expect(screen.getByRole("button", { name: "Manage in Settings" })).toBeInTheDocument();
  });

  it("renders the month grid weekday header in calendar view", () => {
    connectAccount();
    patch({ events: [timedEvent()] });
    renderWidget();
    expect(screen.getAllByText("W").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Manage in Settings" })).not.toBeInTheDocument();
  });

  it("renders event titles and separates multi-day events in list view", () => {
    connectAccount();
    patch({ view: "list", events: [timedEvent(), multiDayEvent()] });

    renderWidget();

    expect(screen.getByText("Standup")).toBeInTheDocument();
    expect(screen.getByText("Team Trip")).toBeInTheDocument();
    expect(screen.getByText("Multi-day")).toBeInTheDocument();
  });

  it("opens the source event in a new tab from list view", () => {
    connectAccount();
    patch({ view: "list", events: [timedEvent()] });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderWidget();
    fireEvent.click(screen.getByRole("button", { name: "Open Standup in Google Calendar" }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://calendar.google.com/standup",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });
});