import { Input } from "@/components/ui/input";
import { useRef } from "react";
import { ConfigSelect } from "@/components/config/Config";
import { ArrowDownWideNarrow, ChartColumn, Search, X } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";

export type WatchlistSort = "manual" | "symbol" | "gainers" | "losers" | "volume";

export function WatchlistTools({
  filter,
  sort,
  onFilter,
  onSort,
  showVolume,
  onVolume,
  allowVolume,
}: {
  filter: string;
  sort: WatchlistSort;
  onFilter: (value: string) => void;
  onSort: (value: WatchlistSort) => void;
  showVolume: boolean;
  onVolume: () => void;
  allowVolume: boolean;
}) {
  const filterRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex shrink-0 items-center gap-1.5 py-1.5">
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="
            text-ink-3 pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2
          "
        />
        <Input
          ref={filterRef}
          name="watchlist-filter"
          autoComplete="off"
          spellCheck={false}
          aria-label="Filter watchlist"
          placeholder="Filter watchlist"
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          className="h-7 pl-7 pr-7 text-caption"
        />
        {filter && (
          <button
            type="button"
            aria-label="Clear watchlist filter"
            onClick={() => {
              onFilter("");
              filterRef.current?.focus();
            }}
            className="
              focus-ring text-ink-3
              hover:text-ink
              absolute top-0 right-0 flex size-7 cursor-pointer items-center justify-center
              rounded-sm
            "
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
      {allowVolume && (
        <IconActionButton
          icon={ChartColumn}
          label={showVolume ? "Hide volume column" : "Show volume column at wider sizes"}
          tooltip="Volume column"
          onClick={onVolume}
          pressed={showVolume}
          size="icon-xs"
        />
      )}
      <ConfigSelect
        label="Watchlist order"
        icon={ArrowDownWideNarrow}
        value={sort}
        options={[
          { value: "manual", label: "Manual" },
          { value: "symbol", label: "Symbol" },
          { value: "gainers", label: "Gainers" },
          { value: "losers", label: "Losers" },
          { value: "volume", label: "Volume" },
        ]}
        onChange={onSort}
        triggerClassName="h-7 w-28 gap-1.5 text-caption"
      />
    </div>
  );
}
