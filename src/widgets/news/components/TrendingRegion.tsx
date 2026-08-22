import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TREND_REGIONS, type TrendRegion } from "@/widgets/news/lib/trend-regions";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function TrendingRegion() {
  const instanceId = useWidgetInstanceId();
  const region = useNews((d) => d.trendRegion);
  const setRegion = useNewsStore((s) => s.setTrendRegion);

  return (
    <Select
      value={region}
      onValueChange={(next) => {
        const match = TREND_REGIONS.find((entry) => entry.code === next);
        if (match) setRegion(instanceId, match.code as TrendRegion);
      }}
    >
      <SelectTrigger
        aria-label="Trending in"
        className={cn("w-48 max-w-full gap-2 [&>[data-slot=select-value]]:truncate")}
      >
        <Globe className="text-ink-3 size-3.5 shrink-0" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {TREND_REGIONS.map((entry) => (
          <SelectItem key={entry.code} value={entry.code}>
            {entry.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
