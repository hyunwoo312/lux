import { Input } from "@/components/ui/input";
import { ConfigSelect } from "@/components/config/Config";
import { ChartColumn } from "lucide-react";
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
  return (
    <div className="flex shrink-0 items-center gap-1.5 py-1.5">
      <Input
        aria-label="Filter watchlist"
        placeholder="Filter symbols"
        value={filter}
        onChange={(event) => onFilter(event.target.value)}
        className="h-7 flex-1 text-caption"
      />
      {allowVolume && (
        <IconActionButton
          icon={ChartColumn}
          label={showVolume ? "Hide volume column" : "Show volume column at wider sizes"}
          tooltip="Volume column"
          onClick={onVolume}
        />
      )}
      <ConfigSelect
        label="Watchlist order"
        value={sort}
        options={[
          { value: "manual", label: "Manual" },
          { value: "symbol", label: "Symbol" },
          { value: "gainers", label: "Gainers" },
          { value: "losers", label: "Losers" },
          { value: "volume", label: "Volume" },
        ]}
        onChange={onSort}
        triggerClassName="h-7 w-24 text-caption"
      />
    </div>
  );
}
