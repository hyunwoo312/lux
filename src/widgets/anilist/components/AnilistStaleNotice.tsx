import { CloudOff, WifiOff } from "lucide-react";
import { formatRelativeTime } from "@/lib/relative-time";
import { classifyLoadError } from "@/widgets/anilist/lib/load-failure";
import type { Freshness } from "@/widgets/core/usePolledResource";

export function AnilistStaleNotice({ freshness }: { freshness: Freshness }) {
  if (freshness.status !== "failing") return null;

  const offline = classifyLoadError(freshness.error) === "offline";
  const Icon = offline ? WifiOff : CloudOff;
  const label = offline ? "Offline" : "AniList isn’t responding";

  return (
    <p role="status" className="text-ink-3 flex items-center gap-1.5 px-2 pb-1.5 text-micro">
      <Icon className="size-3 shrink-0" aria-hidden />
      {label} · updated {formatRelativeTime(new Date(freshness.since).toISOString())}
    </p>
  );
}
