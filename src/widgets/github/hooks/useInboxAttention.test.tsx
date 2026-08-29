// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations", async () => {
  const actual = await vi.importActual<typeof import("@/integrations")>("@/integrations");
  return { ...actual, integrationFetch: vi.fn() };
});

import { render, screen, waitFor } from "@testing-library/react";
import { integrationFetch, useIntegrationStore } from "@/integrations";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { GithubTabs } from "@/widgets/github/GithubTabs";
import { InboxView } from "@/widgets/github/components/InboxView";
import { useGithubStore } from "@/widgets/github/useGithubStore";

const mockFetch = vi.mocked(integrationFetch);
const ID = "github-1";

function inboxResponses() {
  mockFetch.mockImplementation((_provider, url, init) => {
    if (String(url).includes("/graphql")) {
      const body = String((init as RequestInit | undefined)?.body ?? "");
      if (body.includes("watching(")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: { viewer: { watching: { totalCount: 0, nodes: [] } } } }),
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              reviewRequested: {
                nodes: [
                  {
                    id: "pr1",
                    title: "Fix it",
                    url: "https://github.com/o/r/pull/1",
                    number: 1,
                    isDraft: false,
                    updatedAt: "2026-08-01T00:00:00Z",
                    repository: { nameWithOwner: "o/r", isPrivate: false },
                    author: { login: "someone" },
                    reviewDecision: null,
                    commits: { nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
                  },
                ],
              },
              mine: { nodes: [] },
              assigned: { nodes: [] },
              mentioned: { nodes: [] },
            },
          }),
        ),
      );
    }
    return Promise.resolve(new Response(JSON.stringify([])));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  localStorage.clear();
  useIntegrationStore.setState({
    loaded: true,
    accounts: [
      {
        id: "github-1",
        providerId: "github",
        providerAccountId: "1",
        displayName: "Test",
        status: "connected",
        connectedAt: "2026-06-20T00:00:00.000Z",
      },
    ],
  });
  useGithubStore.setState({
    byInstance: {
      [ID]: {
        view: "inbox",
        showPrivate: true,
        showDrafts: true,
        inboxFilter: "all",
        collapsedRepos: [],
        openBehavior: "currentTab",
      },
    },
  });
});

afterEach(() => {
  clearPolledResources();
});

describe("the inbox tab badge", () => {
  it("counts what is waiting on you", async () => {
    inboxResponses();
    render(
      <WidgetInstanceContext.Provider value={ID}>
        <TooltipProvider>
          <GithubTabs />
        </TooltipProvider>
      </WidgetInstanceContext.Provider>,
    );

    expect(await screen.findByRole("tab", { name: "Inbox (1)" })).toBeInTheDocument();
  });

  it("shares one request with the inbox view rather than fetching twice", async () => {
    inboxResponses();
    render(
      <WidgetInstanceContext.Provider value={ID}>
        <TooltipProvider>
          <GithubTabs />
          <InboxView enabled showPrivate />
        </TooltipProvider>
      </WidgetInstanceContext.Provider>,
    );

    await screen.findByRole("tab", { name: "Inbox (1)" });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const inboxCalls = mockFetch.mock.calls.filter(([, , init]) =>
      String((init as RequestInit | undefined)?.body ?? "").includes("review-requested:@me"),
    );
    expect(inboxCalls).toHaveLength(1);
  });
});
