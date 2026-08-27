// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/sports/lib/teamIndex", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/teamIndex")>()),
  fetchTeamIndex: vi.fn(),
  parseCachedTeamIndex: () => null,
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { TeamSearchResults } from "@/widgets/sports/components/TeamSearchResults";
import { fetchTeamIndex } from "@/widgets/sports/lib/teamIndex";
import { MAX_TEAMS, useSportsStore } from "@/widgets/sports/useSportsStore";
import { seedSportsInstance } from "@/widgets/sports/lib/fixtures";
import type { LeagueFollowing } from "@/widgets/sports/types";

const fetchMock = vi.mocked(fetchTeamIndex);
const ID = "search";

const INDEX = [
  { leagueId: "mlb", abbreviation: "NYY", name: "Yankees" },
  { leagueId: "epl", abbreviation: "ARS", name: "Arsenal" },
];

function renderResults(query: string, following: Record<string, LeagueFollowing> = {}) {
  seedSportsInstance(ID, { following, window: "today" });
  render(
    <WidgetInstanceContext.Provider value={ID}>
      <TeamSearchResults query={query} />
    </WidgetInstanceContext.Provider>,
  );
}

const followed = (leagueId: string) =>
  useSportsStore.getState().byInstance[ID]?.following[leagueId]?.teams ?? [];

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  useSportsStore.setState({ byInstance: {} });
});

describe("TeamSearchResults", () => {
  it("reaches teams outside the league on screen", async () => {
    fetchMock.mockResolvedValue(INDEX);
    renderResults("ars");

    expect(await screen.findByRole("button", { name: /Arsenal/ })).toBeInTheDocument();
  });

  it("follows a team in its own league, not the one being viewed", async () => {
    fetchMock.mockResolvedValue(INDEX);
    renderResults("ars");

    fireEvent.click(await screen.findByRole("button", { name: /Arsenal/ }));

    expect(followed("epl")).toEqual(["ARS"]);
    expect(followed("mlb")).toEqual([]);
  });

  it("unfollows on a second press, so the row is the only control", async () => {
    fetchMock.mockResolvedValue(INDEX);
    renderResults("ars", { epl: { teams: ["ARS"] } });

    const row = await screen.findByRole("button", { name: /Arsenal/ });
    expect(row).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(row);
    expect(followed("epl")).toEqual([]);
  });

  it("refuses a team once that league is full", async () => {
    fetchMock.mockResolvedValue(INDEX);
    const full = Array.from({ length: MAX_TEAMS }, (_, index) => `T${index}`);
    renderResults("ars", { epl: { teams: full } });

    expect(await screen.findByRole("button", { name: /Arsenal/ })).toBeDisabled();
  });

  it("offers a tour to follow, since a golf week is a tour not a team", async () => {
    fetchMock.mockResolvedValue(INDEX);
    renderResults("pga");

    fireEvent.click(await screen.findByRole("button", { name: "Follow PGA Tour" }));

    expect(useSportsStore.getState().byInstance[ID]?.following["pga"]?.tour).toBe(true);
  });
});
