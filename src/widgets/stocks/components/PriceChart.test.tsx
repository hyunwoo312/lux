// @vitest-environment jsdom
import { fireEvent, render as renderUi, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { PriceChart } from "@/widgets/stocks/components/PriceChart";
import type { PriceBar } from "@/widgets/stocks/types";

const bar = (time: number, close: number): PriceBar => ({
  time,
  close,
  open: close,
  high: close,
  low: close,
  volume: null,
});

const BARS = [bar(1, 10), bar(2, 11.5), bar(3, 12)];
const render = (ui: ReactElement) => renderUi(<TooltipProvider>{ui}</TooltipProvider>);

describe("PriceChart inspection", () => {
  it("zooms only within loaded history and restores all bars", () => {
    render(
      <PriceChart
        bars={Array.from({ length: 40 }, (_, index) => bar(index, index + 10))}
        direction="up"
        style="line"
        range="1mo"
        priceHint={2}
        timeZone={null}
        dividends={[]}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Inspect the chart" });
    fireEvent.click(screen.getByRole("button", { name: "Zoom into chart" }));
    expect(slider).toHaveAttribute("aria-valuemax", "29");
    expect(screen.getByRole("button", { name: "Earlier chart history" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset chart zoom" }));
    expect(slider).toHaveAttribute("aria-valuemax", "39");
    expect(screen.getByRole("button", { name: "Earlier chart history" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
  it("walks the bars with the arrow keys and clears with Escape", () => {
    render(
      <PriceChart
        bars={BARS}
        direction="up"
        style="line"
        range="1d"
        priceHint={2}
        timeZone={null}
        dividends={[]}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Inspect the chart" });

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider.getAttribute("aria-valuetext")).toMatch(/^12\.00, /);

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider.getAttribute("aria-valuetext")).toMatch(/^11\.50, /);

    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider.getAttribute("aria-valuetext")).toMatch(/^10\.00, /);

    expect(fireEvent.keyDown(slider, { key: "Escape" })).toBe(false);
    expect(slider).toHaveAttribute("aria-valuenow", "2");
  });

  it("leaves Escape to the layer above when nothing is being inspected", () => {
    render(
      <PriceChart
        bars={BARS}
        direction="up"
        style="line"
        range="1d"
        priceHint={2}
        timeZone={null}
        dividends={[]}
      />,
    );

    expect(fireEvent.keyDown(screen.getByRole("slider"), { key: "Escape" })).toBe(true);
  });
});
