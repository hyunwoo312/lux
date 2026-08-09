// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/sports/lib/espn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/espn")>()),
  fetchTeams: vi.fn(),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { fetchTeams } from "@/widgets/sports/lib/espn";
import { TeamPicker } from "@/widgets/sports/components/TeamPicker";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { MAX_TEAMS, useSportsStore } from "@/widgets/sports/useSportsStore";

const fetchMock = vi.mocked(fetchTeams);
const INSTANCE = "team-picker";

function renderPicker(teams: string[] = []) {
  useSportsStore.setState({
    byInstance: {
      [INSTANCE]: { leagueId: "mlb", teams, states: ["in", "pre", "post"], window: "today" },
    },
  });
  render(
    <WidgetInstanceContext.Provider value={INSTANCE}>
      <TeamPicker />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSportsStore.setState({ byInstance: {} });
});

describe("TeamPicker", () => {
  it("shows each team's badge alongside its abbreviation", async () => {
    fetchMock.mockResolvedValue([
      { abbreviation: "NYY", name: "Yankees", logo: "https://a.espncdn.com/nyy.png" },
      { abbreviation: "BOS", name: "Red Sox", logo: "https://a.espncdn.com/bos.png" },
    ]);
    renderPicker();

    const option = await screen.findByRole("button", { name: /NYY/ });
    const logo = option.querySelector("img");
    expect(logo).toHaveAttribute("src", "https://a.espncdn.com/nyy.png");
  });

  it("still lists a team that has no badge", async () => {
    fetchMock.mockResolvedValue([{ abbreviation: "ATH", name: "Athletics" }]);
    renderPicker();

    const option = await screen.findByRole("button", { name: /ATH/ });
    expect(option.querySelector("img")).toBeNull();
  });

  it("records the team the user picked", async () => {
    fetchMock.mockResolvedValue([{ abbreviation: "NYY", name: "Yankees" }]);
    renderPicker();

    fireEvent.click(await screen.findByRole("button", { name: /NYY/ }));

    expect(useSportsStore.getState().byInstance[INSTANCE]?.teams).toEqual(["NYY"]);
  });

  it("stops offering new teams once the cap is reached", async () => {
    const full = Array.from({ length: MAX_TEAMS }, (_, index) => `T${index}`);
    fetchMock.mockResolvedValue(
      [...full, "EXTRA"].map((abbreviation) => ({ abbreviation, name: abbreviation })),
    );
    renderPicker(full);

    expect(await screen.findByRole("button", { name: /EXTRA/ })).toBeDisabled();
  });

  it("explains itself while loading and when the league list fails", async () => {
    fetchMock.mockRejectedValue(new Error("nope"));
    renderPicker();

    expect(await screen.findByText("Couldn’t load teams.")).toBeInTheDocument();
  });
});
