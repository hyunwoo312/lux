// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { GithubWidget } from "@/widgets/github/GithubWidget";
import { useGithubStore, type GithubData } from "@/widgets/github/useGithubStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { GithubView } from "@/widgets/github/types";

const ID = "github-1";

function patchView(view: GithubView) {
  useGithubStore.setState({
    byInstance: {
      [ID]: {
        view,
        showPrivate: true,
        showDrafts: true,
        inboxFilter: "all",
        collapsedRepos: [],
        openBehavior: "currentTab",
      },
    },
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
});

describe("inbox filtering and collapse", () => {
  function patchInbox(patch: Partial<GithubData> = {}) {
    useGithubStore.setState({
      byInstance: {
        [ID]: {
          view: "inbox",
          showPrivate: true,
          showDrafts: true,
          inboxFilter: "all",
          collapsedRepos: [],
          openBehavior: "currentTab",
          ...patch,
        },
      },
    });
  }

  it("keeps the filter control reachable while filtered", () => {
    patchInbox({ inboxFilter: "notifications" });
    renderWidget();

    expect(screen.getByRole("radiogroup", { name: "Filter the inbox" })).toBeInTheDocument();
    expect(screen.queryByText("Fix flaky auth integration test")).not.toBeInTheDocument();
  });

  it("drops draft pull requests when drafts are hidden", () => {
    patchInbox({ showDrafts: false });
    renderWidget();

    expect(screen.queryByText("WIP: refactor grid layout engine")).not.toBeInTheDocument();
    expect(screen.getByText("Fix flaky auth integration test")).toBeInTheDocument();
  });
});
