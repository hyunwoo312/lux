import { DURATION } from "@/lib/motion";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import type { Freshness } from "@/widgets/core/usePolledResource";
import { syncCooldownMessage, syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";

type WidgetRefreshButtonProps = {
  syncing: boolean;
  lastSyncAt: number | undefined;
  updatedAt?: number;
  cooldownMs: number;
  freshness?: Freshness;
  label: string;
  onRefresh: () => void;
};

export function WidgetRefreshButton({
  syncing,
  lastSyncAt,
  updatedAt,
  cooldownMs,
  freshness,
  label,
  onRefresh,
}: WidgetRefreshButtonProps) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  const remainingMs = syncCooldownRemainingMs(lastSyncAt, cooldownMs, now);
  const coolingDown = remainingMs > 0;
  const freshAt = (updatedAt ?? lastSyncAt) || undefined;

  useEffect(() => {
    if (!coolingDown && freshAt === undefined) return;
    const id = window.setInterval(() => setNow(Date.now()), coolingDown ? 1000 : 60_000);
    return () => window.clearInterval(id);
  }, [coolingDown, freshAt]);

  const spinning = syncing && !reduced;
  const disabled = syncing || coolingDown;
  const failing = freshness?.status === "failing";
  const staleSince = failing && freshness.since ? formatRelativeTime(freshness.since, now) : null;
  const staleNotice = failing
    ? staleSince
      ? `${label} last updated ${staleSince}. Refreshing is failing, retrying automatically.`
      : `${label} isn’t refreshing. Retrying automatically.`
    : null;

  return (
    <Tooltip
      content={
        staleNotice
          ? staleNotice
          : coolingDown
            ? syncCooldownMessage(remainingMs)
            : freshAt !== undefined
              ? `Updated ${formatRelativeTime(freshAt, now)}`
              : "Refresh"
      }
      sticky
    >
      <Button
        variant="ghost"
        size="icon-xs"
        className={cn(WIDGET_HEADER_ACTION, failing && "text-warning hover:text-warning")}
        aria-label={staleNotice ?? "Refresh"}
        disabled={disabled}
        onClick={onRefresh}
      >
        <motion.span
          className="inline-flex"
          animate={{ rotate: spinning ? 360 : 0 }}
          transition={
            spinning
              ? { repeat: Infinity, ease: "linear", duration: 0.8 }
              : { duration: DURATION.base }
          }
        >
          <RefreshCw />
        </motion.span>
        <span aria-live="polite" className="sr-only">
          {staleNotice}
        </span>
      </Button>
    </Tooltip>
  );
}
