// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { LeagueSelector } from "@/widgets/sports/components/LeagueSelector";
import type { Sport } from "@/widgets/sports/lib/leagues";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { useSportsStore } from "@/widgets/sports/useSportsStore";

const ID = "sports-1";

function seed(leagueId = "mlb") {
  useSportsStore.setState({
    byInstance: {
      [ID]: {
        tab: "discover",
        collapsed: [],
        leagueId,
        following: {},
        states: ["in", "pre", "post"],
        window: "today",
      },
    },
  });
}

function Host({ onPick }: { onPick: () => void }) {
  const [sport, setSport] = useState<Sport | null>(null);
  return <LeagueSelector sport={sport} onSport={setSport} onPick={onPick} />;
}

function renderSelector(onPick = vi.fn()) {
  render(
    <WidgetInstanceContext.Provider value={ID}>
      <Host onPick={onPick} />
    </WidgetInstanceContext.Provider>,
  );
  return onPick;
}

beforeEach(() => seed());

describe("LeagueSelector", () => {
  it("picks a league and tells its owner it is done", async () => {
    const onPick = renderSelector();
    fireEvent.click(screen.getByRole("button", { name: "Soccer leagues" }));
    fireEvent.click(await screen.findByText("Premier League"));

    expect(useSportsStore.getState().byInstance[ID]?.leagueId).toBe("epl");
    expect(onPick).toHaveBeenCalled();
  });

  it("keeps a league's followed teams when moving to another league", async () => {
    useSportsStore.getState().toggleTeam(ID, "mlb", "NYY");
    renderSelector();
    fireEvent.click(screen.getByRole("button", { name: "Soccer leagues" }));
    fireEvent.click(await screen.findByText("MLS"));

    expect(useSportsStore.getState().byInstance[ID]?.following["mlb"]?.teams).toEqual(["NYY"]);
  });
});
