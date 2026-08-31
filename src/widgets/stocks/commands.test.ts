// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/stocks/lib/spark", () => ({
  fetchSparks: vi.fn(),
  parseCachedSparks: () => null,
}));

vi.mock("@/widgets/stocks/lib/symbols", () => ({
  searchSymbols: vi.fn(),
  fetchTrendingSymbols: vi.fn(),
  parseCachedTrending: () => null,
}));

import { fetchSparks } from "@/widgets/stocks/lib/spark";
import { searchSymbols } from "@/widgets/stocks/lib/symbols";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { stocksCommands } from "@/widgets/stocks/commands";
import { useStocksStore } from "@/widgets/stocks/useStocksStore";

function place(...ids: string[]) {
  useDashboardStore.setState({ widgets: ids.map((id) => ({ id, type: "stocks" as const })) });
}

async function run(id: string, query: string) {
  const command = stocksCommands().find((entry) => entry.id === id);
  if (command?.kind !== "provider") throw new Error(`expected a ${id} scope`);
  return command.search(query, new AbortController().signal);
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  localStorage.clear();
  place();
  useStocksStore.setState({ byInstance: {} });
});

describe("stocksCommands", () => {
  it("asks for the widget on the write command until one is placed", () => {
    const setupFor = () =>
      stocksCommands()
        .find((command) => command.id === "stocks.addSymbol")
        ?.setup?.();

    expect(setupFor()).toMatchObject({ reason: "Add the Stocks widget" });

    place("s1");
    expect(setupFor()).toBeNull();
  });

  it("reads one watchlist merged from every placed widget, defaults included", async () => {
    place("s1", "s2");
    useStocksStore.getState().addSymbol("s2", "GOOG");
    vi.mocked(fetchSparks).mockResolvedValue({
      AAPL: { symbol: "AAPL", price: 110, previousClose: 100, points: [] },
      MSFT: { symbol: "MSFT", price: 90, previousClose: 100, points: [] },
    });

    const rows = await run("stocks.watchlist", "");

    expect(rows.map((row) => row.label)).toEqual(["AAPL", "MSFT", "NVDA", "TSLA", "GOOG"]);
    expect(rows[0]).toMatchObject({ meta: "$110.00 +10.00%", metaTone: "positive" });
    expect(rows[1]).toMatchObject({ meta: "$90.00 -10.00%", metaTone: "negative" });
    expect(fetchSparks).toHaveBeenCalledTimes(1);
  });

  it("adds the symbol you pick to the placed widget", async () => {
    place("s1");
    vi.mocked(searchSymbols).mockResolvedValue([
      { symbol: "GOOG", name: "Alphabet", exchange: "NMS", sector: null, instrumentType: null },
    ]);

    const [row] = await run("stocks.addSymbol", "goog");
    await row?.run();

    expect(useStocksStore.getState().byInstance.s1?.symbols).toContain("GOOG");
  });
});
