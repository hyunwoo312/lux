import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronLeft, TrendingUp } from "lucide-react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { cn } from "@/lib/utils";
import { getAccentVars } from "@/widgets/core/accent";
import { searchSymbols } from "@/widgets/stocks/lib/yahoo-finance";
import { MAX_SYMBOLS, useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { STOCKS_ACCENT, type SymbolSearchResult } from "@/widgets/stocks/types";

export function StocksSearch() {
  const baseId = useId();
  const instanceId = useWidgetInstanceId();
  const symbols = useStocks((d) => d.symbols);
  const selectedSymbol = useStocks((d) => d.selectedSymbol);
  const addSymbol = useStocksStore((s) => s.addSymbol);
  const clearSelection = useStocksStore((s) => s.clearSelection);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);

  const expanded = open || symbols.length === 0;
  const atCap = symbols.length >= MAX_SYMBOLS;
  const addedSymbols = useMemo(() => new Set(symbols), [symbols]);
  const addedSymbolsRef = useRef(addedSymbols);
  addedSymbolsRef.current = addedSymbols;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    window.clearTimeout(debounceRef.current);
    setSearching(true);
    setError(null);
    debounceRef.current = window.setTimeout(() => {
      searchSymbols(trimmed, controller.signal)
        .then((found) => {
          setResults(found);
          setActive(
            Math.max(
              0,
              found.findIndex((result) => !addedSymbolsRef.current.has(result.symbol)),
            ),
          );
          setSearching(false);
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setError("Couldn't search for symbols.");
          setSearching(false);
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const isAdded = (result: SymbolSearchResult) => addedSymbols.has(result.symbol);

  const pick = (result: SymbolSearchResult) => {
    if (atCap || isAdded(result)) return;
    addSymbol(instanceId, result.symbol);
    setQuery("");
    setResults([]);
  };

  const trimmed = query.trim();
  const showResults = expanded && trimmed.length >= 1;
  const hasOptions = showResults && !atCap && !error && results.length > 0;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const moveActive = (index: number) => {
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
  };

  const stepActive = (direction: 1 | -1) => {
    let index = active;
    for (let step = 0; step < results.length; step += 1) {
      index = (index + direction + results.length) % results.length;
      const result = results[index];
      if (result && !isAdded(result)) {
        moveActive(index);
        return;
      }
    }
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!hasOptions) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        stepActive(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        stepActive(-1);
        return;
      case "Enter": {
        event.preventDefault();
        const result = results[active];
        if (result) pick(result);
        return;
      }
    }
  };

  const inDetail = symbols.length > 1 && selectedSymbol !== null;
  if (inDetail) {
    return (
      <button
        type="button"
        onClick={() => clearSelection(instanceId)}
        className="
          text-muted-foreground
          hover:text-foreground
          inline-flex items-center gap-0.5 text-xs font-medium tracking-wide uppercase
          transition-colors
        "
      >
        <ChevronLeft className="size-4" aria-hidden />
        Stocks
      </button>
    );
  }

  return (
    <ExpandingSearch
      open={expanded}
      onOpenChange={setOpen}
      value={query}
      onValueChange={setQuery}
      onInputKeyDown={onInputKeyDown}
      ariaLabel="Search for a symbol"
      placeholder="Search ticker or company"
      popupOpen={showResults}
      listboxId={hasOptions ? listboxId : undefined}
      activeDescendantId={hasOptions ? optionId(active) : undefined}
    >
      <div
        style={getAccentVars(STOCKS_ACCENT)}
        className="border-input bg-popover w-full overflow-hidden rounded-sm border shadow-md"
      >
        <div className="max-h-56 overflow-y-auto p-1">
          {atCap ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">
              Remove a symbol to add another (max {MAX_SYMBOLS}).
            </p>
          ) : error ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">{error}</p>
          ) : searching && results.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">No matching symbols.</p>
          ) : (
            <ul
              role="listbox"
              id={listboxId}
              aria-label="Search results"
              className="flex flex-col gap-0.5"
            >
              {results.map((result, index) => {
                const added = isAdded(result);
                return (
                  <li key={result.symbol}>
                    <button
                      type="button"
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === active && !added}
                      disabled={added}
                      onMouseMove={() => setActive(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(result)}
                      className={cn(
                        `
                          flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm
                          transition-colors
                        `,
                        index === active && !added
                          ? "bg-accent text-primary"
                          : "hover:bg-accent/60 hover:text-primary",
                        added && "opacity-60",
                      )}
                    >
                      <TrendingUp className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      <span className="shrink-0 font-medium">{result.symbol}</span>
                      <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                        {result.name}
                      </span>
                      {added && (
                        <Check className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ExpandingSearch>
  );
}
