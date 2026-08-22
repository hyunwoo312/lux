// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { CalendarVisibilityPicker } from "@/widgets/calendar/components/CalendarVisibilityPicker";
import { useCalendarStore, type CalendarData } from "@/widgets/calendar/useCalendarStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { ConnectedCalendar } from "@/widgets/calendar/types";

const ID = "calendar-1";

const setCalendarSelection = vi.fn();
const sync = vi.fn(() => Promise.resolve());

function calendar(id: string, summary: string): ConnectedCalendar {
  return { id, summary, primary: false, selected: true };
}

function baseData(over: Partial<CalendarData> = {}): CalendarData {
  const now = new Date();
  return {
    events: [],
    lookaheadDays: 7,
    enabled: true,
    view: "agenda",
    density: "comfortable",
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

function seed(over: Partial<CalendarData> = {}) {
  useCalendarStore.setState({
    byInstance: { [ID]: baseData(over) },
    setCalendarSelection,
    sync,
  });
}

function connectGoogle() {
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

function connectBoth() {
  connectGoogle();
  useIntegrationStore.setState((state) => ({
    accounts: [
      ...state.accounts,
      {
        id: "microsoft-1",
        providerId: "microsoft",
        providerAccountId: "2",
        displayName: "Grace",
        status: "connected",
        connectedAt: "2026-06-20T00:00:00.000Z",
      },
    ],
  }));
}

function renderPicker() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <TooltipProvider>
        <CalendarVisibilityPicker />
      </TooltipProvider>
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  setCalendarSelection.mockClear();
  sync.mockClear();
  useIntegrationStore.setState({ accounts: [], loaded: true });
  useCalendarStore.setState({ byInstance: {} as Record<string, CalendarData> });
});

describe("CalendarVisibilityPicker", () => {
  it("renders nothing when no account is connected", () => {
    seed({
      google: {
        calendars: [calendar("work", "Work")],
        enabledCalendarIds: ["work"],
        failedCalendarIds: [],
      },
    });

    const { container } = renderPicker();

    expect(container).toBeEmptyDOMElement();
  });

  it("lists calendars from both providers", () => {
    connectBoth();
    seed({
      google: {
        calendars: [calendar("work", "Work")],
        enabledCalendarIds: ["work"],
        failedCalendarIds: [],
      },
      microsoft: {
        calendars: [calendar("team", "Team")],
        enabledCalendarIds: ["team"],
        failedCalendarIds: [],
      },
    });
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: /choose calendars/i }));

    expect(screen.getByRole("checkbox", { name: "Work" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Team" })).toBeTruthy();
    expect(screen.getByText("Google")).toBeTruthy();
    expect(screen.getByText("Outlook")).toBeTruthy();
  });

  it("hides a calendar and resyncs that provider when its row is toggled", () => {
    connectGoogle();
    seed({
      google: {
        calendars: [calendar("work", "Work"), calendar("home", "Home")],
        enabledCalendarIds: ["work", "home"],
        failedCalendarIds: [],
      },
    });
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: /choose calendars/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Home" }));

    expect(setCalendarSelection).toHaveBeenCalledWith(ID, "google", "home", false);
    expect(sync).toHaveBeenCalledWith(ID, { bypassCooldown: true, providerId: "google" });
  });

  it("signals on the trigger that some calendars are hidden", () => {
    connectGoogle();
    seed({
      google: {
        calendars: [calendar("work", "Work"), calendar("home", "Home")],
        enabledCalendarIds: ["work"],
        failedCalendarIds: [],
      },
    });
    renderPicker();

    expect(screen.getByRole("button", { name: "Choose calendars, 1 hidden" })).toBeTruthy();
  });

  it("allows deselecting the last remaining calendar", () => {
    connectGoogle();
    seed({
      google: {
        calendars: [calendar("work", "Work")],
        enabledCalendarIds: ["work"],
        failedCalendarIds: [],
      },
    });
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: /choose calendars/i }));
    const only = screen.getByRole("checkbox", { name: "Work" });
    expect(only.getAttribute("aria-disabled")).not.toBe("true");

    fireEvent.click(only);

    expect(setCalendarSelection).toHaveBeenCalledWith(ID, "google", "work", false);
  });
});
