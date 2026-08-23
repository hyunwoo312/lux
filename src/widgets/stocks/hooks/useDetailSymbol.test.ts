import { describe, expect, it } from "vitest";
import { detailSymbol } from "@/widgets/stocks/hooks/useDetailSymbol";

describe("detailSymbol", () => {
  it("shows the only stock on a one-symbol watchlist", () => {
    expect(detailSymbol(["AAPL"], null)).toBe("AAPL");
  });

  it("shows the stock the user picked", () => {
    expect(detailSymbol(["AAPL", "MSFT"], "MSFT")).toBe("MSFT");
  });

  it("stays on the list when nothing is picked", () => {
    expect(detailSymbol(["AAPL", "MSFT"], null)).toBeNull();
  });

  it("stays on the list when the picked stock is no longer on the watchlist", () => {
    expect(detailSymbol(["AAPL", "MSFT"], "TSLA")).toBeNull();
  });

  it("has nothing to show on an empty watchlist", () => {
    expect(detailSymbol([], "AAPL")).toBeNull();
  });
});
