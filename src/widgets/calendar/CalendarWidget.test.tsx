// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { CalendarWidget } from "@/widgets/calendar/CalendarWidget";
import {
  createDefaultData,
  useCalendarStore,
  type CalendarData,
} from "@/widgets/calendar/useCalendarStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { CalendarEvent } from "@/widgets/calendar/types";

const ID = "calendar-1";

function baseData(over: Partial<CalendarData> = {}): CalendarData {
  return { ...createDefaultData(), view: "calendar", ...over };
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
  const start = new Date(Date.now() + 30 * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);
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

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 0, 15, 9, 0, 0, 0));
  useIntegrationStore.setState({ accounts: [], loaded: true });
  useCalendarStore.setState({ byInstance: { [ID]: baseData() } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CalendarWidget", () => {
  it("previews sample events when no account is linked", () => {
    patch({ view: "agenda" });
    renderWidget();
    expect(screen.getByText("Team standup")).toBeInTheDocument();
  });

  it("opens the source event in a new tab from the agenda", () => {
    connectAccount();
    patch({ view: "agenda", events: [timedEvent()] });
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
