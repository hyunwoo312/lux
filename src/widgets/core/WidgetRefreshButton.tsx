import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/relative-time";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/BaseWidget";
import { syncCooldownMessage, syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";

type WidgetRefreshButtonProps = {
  syncing: boolean;
  lastSyncAt: number | undefined;
  updatedAt?: number;
  cooldownMs: number;
  onRefresh: () => void;
};

export function WidgetRefreshButton({
  syncing,
  lastSyncAt,
  updatedAt,
  cooldownMs,
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

  return (
    <Tooltip
      content={
        coolingDown
          ? syncCooldownMessage(remainingMs)
          : freshAt !== undefined
            ? `Updated ${formatRelativeTime(freshAt, now)}`
            : "Refresh"
      }
      sticky
    >
      <Button
        variant="ghost"
        size="icon"
        className={WIDGET_HEADER_ACTION}
        aria-label="Refresh"
        disabled={disabled}
        onClick={onRefresh}
      >
        <motion.span
          className="inline-flex"
          animate={{ rotate: spinning ? 360 : 0 }}
          transition={
            spinning ? { repeat: Infinity, ease: "linear", duration: 0.8 } : { duration: 0.2 }
          }
        >
          <RefreshCw />
        </motion.span>
      </Button>
    </Tooltip>
  );
}
