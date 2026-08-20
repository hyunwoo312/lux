// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { BrowserTab } from "@/widgets/quick-access/components/BrowserTab";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";

const ID = "qa-1";

function closedTab(id: string, title: string) {
  return { tab: { sessionId: id, title, url: `https://${title.toLowerCase()}.com/` } };
}

function mockClosedTabs(sessions: ReturnType<typeof closedTab>[]) {
  const chromeRef = (globalThis as unknown as { chrome: typeof chrome }).chrome;
  chromeRef.sessions.getRecentlyClosed = vi.fn(
    async () => sessions,
  ) as unknown as typeof chrome.sessions.getRecentlyClosed;
}

function renderTab() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <BrowserTab tab="recentlyClosed" editing={false} />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  invalidatePolledResource("quickAccess:recentlyClosed");
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

describe("recently closed tabs", () => {
  it("lists the closed tabs the browser reports", async () => {
    mockClosedTabs([closedTab("s1", "Docs")]);
    renderTab();

    expect(await screen.findByText("Docs")).toBeInTheDocument();
  });

  it("re-reads the list when the view is reopened, not just once a minute", async () => {
    mockClosedTabs([]);
    const first = renderTab();
    await screen.findByText("No recently closed tabs yet");
    first.unmount();

    mockClosedTabs([closedTab("s2", "News")]);
    renderTab();

    await waitFor(() => expect(screen.getByText("News")).toBeInTheDocument());
  });
});
