// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserTab } from "@/widgets/quick-access/components/BrowserTab";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";

const ID = "qa-1";

const chromeRef = () => (globalThis as unknown as { chrome: typeof chrome }).chrome;

beforeEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: { reload: vi.fn() } });
  chromeRef().permissions.getAll = vi.fn(async () => ({
    permissions: ["storage", "sessions"],
    origins: [] as string[],
  })) as unknown as typeof chrome.permissions.getAll;

  useQuickAccessStore.setState({
    byInstance: {
      [ID]: {
        links: [],
        activeTab: "recentlyClosed",
        openBehavior: "currentTab",
        view: "list",
        showTopSites: false,
      },
    },
  });
});

function renderTab() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <BrowserTab tab="recentlyClosed" editing={false} />
    </WidgetInstanceContext.Provider>,
  );
}

describe("recently closed permissions", () => {
  it("asks for permission instead of showing an empty list when tab details are withheld", async () => {
    renderTab();

    await waitFor(() => expect(screen.getByText(/read tab details/)).toBeInTheDocument());
    expect(screen.queryByText("Nothing here yet")).not.toBeInTheDocument();
  });

  it("does not tell a user who already allowed sessions to turn it on again", async () => {
    renderTab();

    await waitFor(() => expect(screen.getByText(/read tab details/)).toBeInTheDocument());
    expect(
      screen.queryByText(/Turn on the Recently closed tabs permission/),
    ).not.toBeInTheDocument();
  });

  it("requests sessions and tabs together, since sessions alone returns no titles", async () => {
    renderTab();
    await screen.findByText(/read tab details/);

    fireEvent.click(screen.getAllByRole("button", { name: "Enable" })[0]!);

    expect(chromeRef().permissions.request).toHaveBeenCalledWith({
      permissions: ["sessions", "tabs"],
    });
  });
});
