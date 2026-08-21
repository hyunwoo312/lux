import { cn } from "@/lib/utils";
import { formatSigned } from "@/widgets/stocks/lib/format";
import { changeTone, deriveChange } from "@/widgets/stocks/lib/quote";
import { useQuote } from "@/widgets/stocks/hooks/useQuote";
import { INDEX_RANGE, MARKET_INDICES } from "@/widgets/stocks/lib/indices";

export function IndexStrip() {
  return (
    <ul className="border-border/50 flex shrink-0 items-center gap-3 border-b px-2 py-1">
      {MARKET_INDICES.map((index) => (
        <IndexCell key={index.symbol} symbol={index.symbol} label={index.label} />
      ))}
    </ul>
  );
}

function IndexCell({ symbol, label }: { symbol: string; label: string }) {
  const { data } = useQuote(symbol, INDEX_RANGE);
  const change = data ? deriveChange(data, data.previousClose) : null;

  return (
    <li className="flex min-w-0 items-baseline gap-1.5">
      <span className="text-ink-3 truncate text-micro">{label}</span>
      <span
        className={cn(
          "text-micro shrink-0 tabular-nums",
          change ? changeTone(change.change) : "text-ink-4",
        )}
      >
        {change ? `${formatSigned(change.percent)}%` : "—"}
      </span>
    </li>
  );
}
