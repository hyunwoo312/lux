import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { enterTween, panelVariants } from "@/lib/motion";
import {
  breakdownOf,
  clearResourceCaches,
  formatBytes,
  measureStorage,
  totalOf,
  type StorageUsage,
} from "@/lib/storage-usage";
import { SettingsSection } from "@/settings/components/SettingsSection";

const SEGMENT_TONES = ["bg-primary", "bg-primary/60", "bg-primary/35", "bg-primary/20"];

function Footprint({ usage }: { usage: StorageUsage }) {
  const reduced = useReducedMotion() ?? false;
  const parts = breakdownOf(usage);
  const total = totalOf(usage);

  if (total === 0) {
    return <p className="text-ink-3 text-caption">Lux is not storing anything yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink text-body font-medium">On this device</span>
        <span className="text-ink text-title font-semibold tabular-nums">{formatBytes(total)}</span>
      </div>

      <div className="bg-foreground/10 flex h-2 overflow-hidden rounded-full" aria-hidden>
        {parts.map((part, index) => (
          <motion.span
            key={part.label}
            className={SEGMENT_TONES[index] ?? "bg-primary/20"}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${(part.bytes / total) * 100}%` }}
            transition={enterTween(reduced, "slow")}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {parts.map((part, index) => (
          <li key={part.label} className="flex items-baseline gap-2.5">
            <span
              aria-hidden
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-xs",
                SEGMENT_TONES[index] ?? "bg-primary/20",
              )}
            />
            <span className="text-ink min-w-0 flex-1 text-caption">
              {part.label}
              <span className="text-ink-4"> · {part.hint}</span>
            </span>
            <span className="text-ink-3 shrink-0 text-caption tabular-nums">
              {formatBytes(part.bytes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StorageSection() {
  const reduced = useReducedMotion() ?? false;
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  const measure = useCallback(() => {
    setFailed(false);
    measureStorage().then(
      (next) => mounted.current && setUsage(next),
      () => mounted.current && setFailed(true),
    );
  }, []);

  useEffect(() => {
    mounted.current = true;
    measure();
    return () => {
      mounted.current = false;
    };
  }, [measure]);

  const clearCache = () => {
    clearResourceCaches();
    measure();
  };

  return (
    <SettingsSection
      title="What Lux is storing"
      action={
        usage && (
          <Button variant="outline" onClick={clearCache} disabled={!usage.localCacheBytes}>
            <RefreshCw aria-hidden />
            Clear cache
          </Button>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={failed ? "error" : !usage ? "loading" : "usage"}
          variants={panelVariants(reduced)}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {failed ? (
            <p className="text-ink-3 text-caption">Storage usage couldn't be measured.</p>
          ) : !usage ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Footprint usage={usage} />
              <p className="text-ink-3 text-caption">
                Lux holds the unlimited-storage permission, so the browser sets no fixed cap.
                Clearing the cache removes only data your widgets can fetch again — notes, tasks and
                links stay.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </SettingsSection>
  );
}
