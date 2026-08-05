// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { GithubTabs } from "@/widgets/github/GithubTabs";
import { GithubWidget } from "@/widgets/github/GithubWidget";
import { useGithubStore } from "@/widgets/github/useGithubStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { GithubView } from "@/widgets/github/types";

const ID = "github-1";

function patchView(view: GithubView) {
  useGithubStore.setState({
    byInstance: { [ID]: { view, showPrivate: true, openBehavior: "currentTab" } },
  });
}

function renderWidget() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <TooltipProvider>
        <GithubWidget />
      </TooltipProvider>
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  useIntegrationStore.setState({ accounts: [], loaded: true });
  patchView("contributions");
});

describe("GithubWidget signed-out preview", () => {
  it("previews the contribution graph with sample data when signed out", () => {
    renderWidget();

    expect(screen.getByText(/contributions in the last year/)).toBeInTheDocument();
  });

  it("previews the inbox with sample data when signed out", () => {
    patchView("inbox");
    renderWidget();

    expect(screen.getByText("Review requests")).toBeInTheDocument();
  });

  it("previews watched releases with sample data when signed out", () => {
    patchView("releases");
    renderWidget();

    expect(screen.getByText("acme/api")).toBeInTheDocument();
    expect(screen.getByText("Pre-release")).toBeInTheDocument();
  });
});

describe("GithubTabs", () => {
  it("switches the widget to any of the three views in one click", () => {
    render(
      <WidgetInstanceContext.Provider value={ID}>
        <TooltipProvider>
          <GithubTabs />
          <GithubWidget />
        </TooltipProvider>
      </WidgetInstanceContext.Provider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Releases" }));
    expect(screen.getByText("acme/cli")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Inbox" }));
    expect(screen.getByText("Review requests")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Contributions" }));
    expect(screen.getByText(/contributions in the last year/)).toBeInTheDocument();
  });

  it("marks only the active view as selected", () => {
    patchView("releases");
    render(
      <WidgetInstanceContext.Provider value={ID}>
        <GithubTabs />
      </WidgetInstanceContext.Provider>,
    );

    expect(screen.getByRole("tab", { name: "Releases" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("aria-selected", "false");
  });
});
