// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OpenAllPinsButton } from "@/widgets/quick-access/components/OpenAllPinsButton";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { QuickAccessTab } from "@/widgets/quick-access/types";

const ID = "qa-1";

function renderButton() {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>
        <OpenAllPinsButton />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

function seed(urls: string[], activeTab: QuickAccessTab = "home") {
  useQuickAccessStore.setState({
    byInstance: {
      [ID]: {
        links: urls.map((url, index) => ({ id: `link-${index}`, title: url, url })),
        view: "grid",
        openBehavior: "currentTab",
        activeTab,
        showTopSites: false,
        showOpenTabs: false,
        showRecentlyClosed: false,
      },
    },
  });
}

beforeEach(() => {
  useQuickAccessStore.setState({ byInstance: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OpenAllPinsButton", () => {
  it("opens every pinned link in a new tab", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    seed(["https://a.example", "https://b.example"]);
    renderButton();

    fireEvent.click(screen.getByLabelText("Open all 2 links in new tabs"));

    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenNthCalledWith(1, "https://a.example", "_blank", "noopener,noreferrer");
    expect(open).toHaveBeenNthCalledWith(2, "https://b.example", "_blank", "noopener,noreferrer");
  });

  it("opens in a new tab even when the widget opens links in the current tab", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    seed(["https://a.example"]);
    renderButton();

    fireEvent.click(screen.getByLabelText("Open all 1 link in new tabs"));

    expect(open).toHaveBeenCalledWith("https://a.example", "_blank", "noopener,noreferrer");
  });

  it("stays hidden with no pinned links", () => {
    seed([]);
    renderButton();

    expect(screen.queryByLabelText(/Open all/)).not.toBeInTheDocument();
  });

  it("stays hidden away from the home tab", () => {
    seed(["https://a.example"], "bookmarks");
    renderButton();

    expect(screen.queryByLabelText(/Open all/)).not.toBeInTheDocument();
  });
});
