import { useCallback } from "react";
import { LineChart, Sparkles } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { TRENDING_KEY } from "@/widgets/stocks/lib/cacheKeys";
import { fetchTrendingSymbols, parseCachedTrending } from "@/widgets/stocks/lib/symbols";

const TRENDING_INTERVAL_MS = 60 * 60_000;
const MAX_SUGGESTIONS = 8;

export function StocksEmptyState({ onAdd }: { onAdd: (symbol: string) => void }) {
  const fetcher = useCallback((signal: AbortSignal) => fetchTrendingSymbols(signal), []);
  const { state } = usePolledResource(fetcher, {
    intervalMs: TRENDING_INTERVAL_MS,
    cacheKey: TRENDING_KEY,
    persist: true,
    parsePersisted: parseCachedTrending,
  });
  const trending = state.status === "success" ? state.data.slice(0, MAX_SUGGESTIONS) : [];

  return (
    <StateMessage
      icon={LineChart}
      message="Search above to follow a ticker, index, fund or coin."
      action={
        trending.length > 0 ? (
          <div className="flex max-w-full flex-col items-center gap-1.5">
            <span className={cn(TYPE.eyebrow, "inline-flex items-center gap-1")}>
              <Sparkles className="size-3" aria-hidden />
              Trending today
            </span>
            <ul className="flex flex-wrap justify-center gap-1">
              {trending.map((symbol) => (
                <li key={symbol}>
                  <button
                    type="button"
                    onClick={() => onAdd(symbol)}
                    aria-label={`Add ${symbol}`}
                    className="
                      press cursor-pointer focus-ring border-border text-ink-2 rounded-sm border
                      px-1.5 py-0.5 text-micro font-medium transition-colors
                      hover:border-primary/50 hover:text-ink
                    "
                  >
                    {symbol}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    />
  );
}
