import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { openUrl } from "@/lib/open-url";

const TRENDS_URL = "https://trends.google.com/trending";

export function TrendsAttribution() {
  return (
    <button
      type="button"
      onClick={() => openUrl(TRENDS_URL, "newTab")}
      className={cn(
        TYPE.rowMeta,
        `
          focus-ring
          hover:text-ink-3
          w-full cursor-pointer rounded-sm px-2 py-1 text-left transition-colors
        `,
      )}
    >
      Data source: Google Trends
    </button>
  );
}
