// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeagueMenu } from "@/widgets/sports/components/LeagueMenu";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { LEAGUES } from "@/widgets/sports/lib/leagues";
import { useSportsStore } from "@/widgets/sports/useSportsStore";

const INSTANCE = "league-menu";

function renderMenu(leagueId = "mlb", teams: string[] = []) {
  useSportsStore.setState({
    byInstance: {
      [INSTANCE]: { leagueId, teams, states: ["in", "pre", "post"], window: "today" },
    },
  });
  render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={INSTANCE}>
        <LeagueMenu />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useSportsStore.setState({ byInstance: {} });
});

describe("LeagueMenu", () => {
  it("names the league currently in view", () => {
    renderMenu("nhl");

    expect(screen.getByRole("button", { name: "Change league" })).toHaveTextContent("NHL");
  });

  it("offers every league once opened", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Change league" }));

    for (const league of LEAGUES) {
      expect(screen.getByRole("button", { name: league.label })).toBeInTheDocument();
    }
  });

  it("switches the widget to the league that was picked", () => {
    renderMenu("mlb");
    fireEvent.click(screen.getByRole("button", { name: "Change league" }));
    fireEvent.click(screen.getByRole("button", { name: "NBA" }));

    expect(useSportsStore.getState().byInstance[INSTANCE]?.leagueId).toBe("nba");
  });

  it("clears followed teams when moving to a different league", () => {
    renderMenu("mlb", ["NYY"]);
    fireEvent.click(screen.getByRole("button", { name: "Change league" }));
    fireEvent.click(screen.getByRole("button", { name: "NHL" }));

    expect(useSportsStore.getState().byInstance[INSTANCE]?.teams).toEqual([]);
  });
});
