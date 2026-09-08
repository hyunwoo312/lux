import { useState } from "react";
import {
  Banknote,
  Bitcoin,
  Boxes,
  Building2,
  ChartLine,
  Check,
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
import { ListboxStatus } from "@/components/ListboxStatus";
import { OptionRow } from "@/components/OptionRow";
import { HeaderBackButton } from "@/widgets/core/HeaderBackButton";

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
    return <HeaderBackButton label="Stocks" onClick={() => clearSelection(instanceId)} />;
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
        <ListboxStatus>Remove a symbol to add another (max {MAX_SYMBOLS}).</ListboxStatus>
      ) : state.status === "error" ? (
        <ListboxStatus>Couldn’t search for symbols.</ListboxStatus>
      ) : state.status === "loading" && results.length === 0 ? (
        <ListboxStatus>Searching…</ListboxStatus>
      ) : results.length === 0 ? (
        <ListboxStatus>No matching symbols.</ListboxStatus>
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
                <OptionRow
                  id={optionId(index)}
                  active={index === active}
                  disabled={added}
                  onActivate={() => setActive(index)}
                  onPick={() => pick(result)}
                >
                  <Icon className="text-ink-3 size-4 shrink-0" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="shrink-0 text-body font-medium">{result.symbol}</span>
                      <span className={cn(TYPE.rowMeta, "min-w-0 truncate")}>{result.name}</span>
                    </span>
                    {meta ? <span className={cn(TYPE.rowMeta, "truncate")}>{meta}</span> : null}
                  </span>
                  {added && <Check className="text-ink-3 size-4 shrink-0" aria-hidden />}
                </OptionRow>
              </li>
            );
          })}
        </ul>
      )}
    </ExpandingSearch>
  );
}
