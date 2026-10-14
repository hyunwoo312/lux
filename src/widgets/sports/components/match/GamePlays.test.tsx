// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GamePlays } from "@/widgets/sports/components/match/GamePlays";
import type { GamePlay, GameSummary } from "@/widgets/sports/types";
import { TooltipProvider } from "@/components/ui/tooltip";

const play = (id: string): GamePlay => ({
  id,
  text: `Basket ${id}`,
  clock: "1:23",
  period: 1,
  scoring: true,
});
const summary = (plays: GamePlay[]): GameSummary => ({
  eventId: "g",
  context: "game",
  stats: [],
  players: [],
  drives: [],
  plays,
});

describe("game play updates", () => {
  it("keeps the reader's position until new plays are requested", () => {
    const { rerender } = render(
      <TooltipProvider>
        <GamePlays football={false} summary={summary([play("old")])} />
      </TooltipProvider>,
    );
    rerender(
      <TooltipProvider>
        <GamePlays football={false} summary={summary([play("old"), play("new")])} />
      </TooltipProvider>,
    );
    expect(screen.getByText("Basket old")).toBeInTheDocument();
    expect(screen.queryByText("Basket new")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1 new play" }));
    expect(screen.getByText("Basket new")).toBeInTheDocument();
  });
});
