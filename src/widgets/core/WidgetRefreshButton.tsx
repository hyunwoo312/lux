import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/BaseWidget";
import { syncCooldownMessage, syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";

type WidgetRefreshButtonProps = {
  syncing: boolean;
  lastSyncAt: number | undefined;
  cooldownMs: number;
  onRefresh: () => void;
};

export function WidgetRefreshButton({
  syncing,
  lastSyncAt,
  cooldownMs,
  onRefresh,
}: WidgetRefreshButtonProps) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  const remainingMs = syncCooldownRemainingMs(lastSyncAt, cooldownMs, now);
  const coolingDown = remainingMs > 0;

  useEffect(() => {
    if (!coolingDown) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [coolingDown]);

  const spinning = syncing && !reduced;
  const disabled = syncing || coolingDown;

  return (
    <Tooltip content={coolingDown ? syncCooldownMessage(remainingMs) : "Refresh"} sticky>
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
