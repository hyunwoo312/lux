import { CloudOff, WifiOff } from "lucide-react";
import { isOnline } from "@/lib/net";
import { formatRelativeTime } from "@/lib/relative-time";
import type { Freshness } from "@/widgets/core/usePolledResource";

export function GithubStaleNotice({ freshness }: { freshness: Freshness }) {
  if (freshness.status !== "failing") return null;

  const offline = !isOnline();
  const Icon = offline ? WifiOff : CloudOff;
  const label = offline ? "Offline" : "GitHub isn’t responding";

  return (
    <p role="status" className="text-ink-3 flex shrink-0 items-center gap-1.5 px-2 text-micro">
      <Icon className="size-3 shrink-0" aria-hidden />
      {label} · updated {formatRelativeTime(new Date(freshness.since).toISOString())}
    </p>
  );
}
