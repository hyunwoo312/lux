// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LeagueBar } from "@/widgets/sports/components/LeagueBar";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { leagueById, type League } from "@/widgets/sports/lib/leagues";

const SERIE_A = leagueById("seriea") as League;

function renderBar(overrides: Partial<Parameters<typeof LeagueBar>[0]> = {}) {
  const props = {
    league: SERIE_A,
    panel: null,
    onOpenSports: vi.fn(),
    onOpenLeagues: vi.fn(),
    ...overrides,
  };
  render(
    <WidgetInstanceContext.Provider value="league-bar">
      <LeagueBar {...props} />
    </WidgetInstanceContext.Provider>,
  );
  return props;
}

describe("LeagueBar", () => {
  it("opens the sports level from the sport crumb", () => {
    const props = renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Soccer" }));

    expect(props.onOpenSports).toHaveBeenCalled();
  });

  it("tells assistive tech which level is open", () => {
    renderBar({ panel: "leagues" });

    expect(screen.getByRole("button", { name: /Serie A/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
