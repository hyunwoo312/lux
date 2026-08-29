import { useState } from "react";
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
import { searchResults, useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useComboboxCursor } from "@/hooks/useComboboxCursor";
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
  const instanceId = useWidgetInstanceId();
  const symbols = useStocks((d) => d.symbols);
  const detail = useDetailSymbol();
  const addSymbol = useStocksStore((s) => s.addSymbol);
  const clearSelection = useStocksStore((s) => s.clearSelection);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const expanded = open || symbols.length === 0;
  const atCap = symbols.length >= MAX_SYMBOLS;

  const state = useDebouncedSearch(query, searchSymbols);
  const results = searchResults(state);

  const isAdded = (result: SymbolSearchResult) => symbols.includes(result.symbol);

  const pick = (result: SymbolSearchResult) => {
    if (atCap || isAdded(result)) return;
    addSymbol(instanceId, result.symbol);
    setQuery("");
  };

  const trimmed = query.trim();
  const showResults = expanded && trimmed.length >= 1;
  const hasOptions = showResults && !atCap && state.status !== "error" && results.length > 0;

  const { active, setActive, listboxId, optionId, onInputKeyDown } = useComboboxCursor(results, {
    enabled: hasOptions,
    onPick: pick,
    isDisabled: isAdded,
  });

  const inDetail = detail !== null && symbols.length > 1;
  if (inDetail) {
    return (
      <button
        type="button"
        onClick={() => clearSelection(instanceId)}
        className="
          press focus-ring cursor-pointer text-ink-3
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
      {atCap ? (
        <p className="text-ink-3 px-2 py-2 text-caption">
          Remove a symbol to add another (max {MAX_SYMBOLS}).
        </p>
      ) : state.status === "error" ? (
        <p className="text-ink-3 px-2 py-2 text-caption">Couldn't search for symbols.</p>
      ) : state.status === "loading" && results.length === 0 ? (
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
              <li key={result.symbol} role="presentation">
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
                    "press-row focus-ring transition-colors cursor-pointer",
                    `
                      flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body
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
                      <span className={cn(TYPE.rowMeta, "min-w-0 truncate")}>{result.name}</span>
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
    </ExpandingSearch>
  );
}
