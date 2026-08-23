// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/sports/lib/espn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/espn")>()),
  fetchScoreboard: vi.fn().mockResolvedValue([]),
  fetchTeams: vi.fn().mockResolvedValue([]),
  parseCachedScoreboard: () => null,
}));
vi.mock("@/widgets/sports/lib/teamIndex", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/teamIndex")>()),
  fetchTeamIndex: vi
    .fn()
    .mockResolvedValue([{ leagueId: "epl", abbreviation: "ARS", name: "Arsenal" }]),
  parseCachedTeamIndex: () => null,
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { DiscoverTab } from "@/widgets/sports/components/DiscoverTab";
import { useSportsStore } from "@/widgets/sports/useSportsStore";

const ID = "discover";

function renderTab() {
  useSportsStore.setState({
    byInstance: {
      [ID]: {
        tab: "discover" as const,
        collapsed: [],
        leagueId: "mlb",
        following: {},
        states: ["in", "pre", "post"] as const,
        window: "today" as const,
      },
    },
  });
  render(
    <WidgetInstanceContext.Provider value={ID}>
      <DiscoverTab />
    </WidgetInstanceContext.Provider>,
  );
}

const searchBox = () => screen.getByRole("textbox", { name: /Search teams in every league/ });

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  useSportsStore.setState({ byInstance: {} });
});

describe("DiscoverTab", () => {
  it("opens the search results as soon as there is something to search for", async () => {
    renderTab();
    fireEvent.change(searchBox(), { target: { value: "ars" } });

    expect(await screen.findByRole("button", { name: /Arsenal/ })).toBeInTheDocument();
  });

  it("closes the league selector when the search takes over", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Baseball" }));
    expect(await screen.findByRole("button", { name: "Baseball leagues" })).toBeInTheDocument();

    fireEvent.change(searchBox(), { target: { value: "ars" } });

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Baseball leagues" })).not.toBeInTheDocument(),
    );
  });

  it("closes the search results when the league selector takes over", async () => {
    renderTab();
    fireEvent.change(searchBox(), { target: { value: "ars" } });
    await screen.findByRole("button", { name: /Arsenal/ });

    fireEvent.click(screen.getByRole("button", { name: "Baseball" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Arsenal/ })).not.toBeInTheDocument(),
    );
  });

  it("shows the sport as the root of the path", () => {
    renderTab();
    const nav = screen.getByRole("navigation", { name: "League" });

    expect(nav.textContent).toBe("BaseballMLB");
  });
});
