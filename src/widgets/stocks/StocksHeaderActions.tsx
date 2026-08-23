import { StocksLayoutToggle } from "@/widgets/stocks/components/StocksLayoutToggle";
import { StocksRefreshButton } from "@/widgets/stocks/StocksRefreshButton";
import { useDetailSymbol } from "@/widgets/stocks/hooks/useDetailSymbol";
import { useStocks } from "@/widgets/stocks/useStocksStore";

export function StocksHeaderActions() {
  const symbols = useStocks((d) => d.symbols);
  const detail = useDetailSymbol();

  return (
    <div className="flex items-center gap-0.5">
      <StocksRefreshButton />
      {detail === null && symbols.length > 1 && <StocksLayoutToggle />}
    </div>
  );
}
