// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { CalendarVisibilityPicker } from "@/widgets/calendar/components/CalendarVisibilityPicker";
import {
  createDefaultData,
  useCalendarStore,
  type CalendarData,
} from "@/widgets/calendar/useCalendarStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { ConnectedCalendar } from "@/widgets/calendar/types";

const ID = "calendar-1";

const setCalendarSelection = vi.fn();
const sync = vi.fn(() => Promise.resolve());

function calendar(id: string, summary: string): ConnectedCalendar {
  return { id, summary, primary: false, selected: true };
}

function baseData(over: Partial<CalendarData> = {}): CalendarData {
  return { ...createDefaultData(), view: "agenda", ...over };
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
