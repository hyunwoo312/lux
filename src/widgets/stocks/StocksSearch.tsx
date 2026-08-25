import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Banknote,
  Bitcoin,
  Boxes,
  Building2,
  ChartLine,
  Check,
  ChevronLeft,
  Layers,
  PiggyBank,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { cn } from "@/lib/utils";
import { searchSymbols } from "@/widgets/stocks/lib/symbols";
import { MAX_SYMBOLS, useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useDetailSymbol } from "@/widgets/stocks/hooks/useDetailSymbol";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { type InstrumentType, type SymbolSearchResult } from "@/widgets/stocks/types";
import { TYPE } from "@/lib/type";

const TYPE_ICON: Record<InstrumentType, LucideIcon> = {
  EQUITY: Building2,
  ETF: Layers,
  INDEX: ChartLine,
  CRYPTOCURRENCY: Bitcoin,
  CURRENCY: Banknote,
  FUTURE: Boxes,
  MUTUALFUND: PiggyBank,
};

export function StocksSearch() {
  const baseId = useId();
  const instanceId = useWidgetInstanceId();
  const symbols = useStocks((d) => d.symbols);
  const detail = useDetailSymbol();
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

  const inDetail = detail !== null && symbols.length > 1;
  if (inDetail) {
    return (
      <button
        type="button"
        onClick={() => clearSelection(instanceId)}
        className="
          press cursor-pointer text-ink-3
          hover:text-ink
          inline-flex items-center gap-0.5 text-caption font-medium tracking-wide uppercase
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
        className={cn("border-input bg-popover w-full overflow-hidden rounded-sm border shadow-md")}
      >
        <div className="max-h-56 overflow-y-auto p-1">
          {atCap ? (
            <p className="text-ink-3 px-2 py-2 text-caption">
              Remove a symbol to add another (max {MAX_SYMBOLS}).
            </p>
          ) : error ? (
            <p className="text-ink-3 px-2 py-2 text-caption">{error}</p>
          ) : searching && results.length === 0 ? (
            <p className="text-ink-3 px-2 py-2 text-caption">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-ink-3 px-2 py-2 text-caption">No matching symbols.</p>
          ) : (
            <ul
              role="listbox"
              id={listboxId}
              aria-label="Search results"
              className="flex flex-col gap-0.5"
            >
              {results.map((result, index) => {
                const added = isAdded(result);
                const Icon = result.instrumentType ? TYPE_ICON[result.instrumentType] : ChartLine;
                const meta = [result.exchange, result.sector].filter(Boolean).join(" · ");
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
                        "press-row transition-colors cursor-pointer",
                        `
                          flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-body
                          transition-colors
                        `,
                        index === active && !added
                          ? "bg-accent text-primary"
                          : "hover:bg-accent/60 hover:text-primary",
                        added && "opacity-60",
                      )}
                    >
                      <Icon className="text-ink-3 size-4 shrink-0" aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <span className="shrink-0 font-medium">{result.symbol}</span>
                          <span className={cn(TYPE.rowSubtitle, "min-w-0 truncate")}>
                            {result.name}
                          </span>
                        </span>
                        {meta ? <span className={cn(TYPE.rowMeta, "truncate")}>{meta}</span> : null}
                      </span>
                      {added && <Check className="text-ink-3 size-4 shrink-0" aria-hidden />}
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
