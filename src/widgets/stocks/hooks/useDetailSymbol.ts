import { useStocks } from "@/widgets/stocks/useStocksStore";

export function detailSymbol(symbols: string[], selectedSymbol: string | null): string | null {
  if (symbols.length === 1) return symbols[0] ?? null;
  if (selectedSymbol && symbols.includes(selectedSymbol)) return selectedSymbol;
  return null;
}

export function useDetailSymbol(): string | null {
  const symbols = useStocks((d) => d.symbols);
  const selectedSymbol = useStocks((d) => d.selectedSymbol);
  return detailSymbol(symbols, selectedSymbol);
}
