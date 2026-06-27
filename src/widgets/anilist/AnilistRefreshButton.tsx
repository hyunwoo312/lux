import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { syncCooldownMessage, syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
import { ANILIST_SYNC_COOLDOWN_MS, useAnilistStore } from "@/widgets/anilist/useAnilistStore";

export function AnilistRefreshButton() {
  const reduced = useReducedMotion();
  const syncing = useAnilistStore((s) => s.syncing);
  const lastSyncAt = useAnilistStore((s) => s.lastSyncAt);
  const requestSync = useAnilistStore((s) => s.requestSync);
  const [now, setNow] = useState(() => Date.now());

  const remainingMs = syncCooldownRemainingMs(lastSyncAt, ANILIST_SYNC_COOLDOWN_MS, now);
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
        className="text-muted-foreground/60 hover:text-foreground size-7 rounded-sm [&_svg]:size-4"
        aria-label="Refresh"
        disabled={disabled}
        onClick={() => requestSync()}
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
