import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HardDrive, Images, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import {
  clearResourceCaches,
  formatBytes,
  LOCAL_STORAGE_CAP_BYTES,
  measureStorage,
  severityOf,
  type StorageSeverity,
  type StorageUsage,
} from "@/lib/storage-usage";
import { SettingsSection } from "@/settings/components/SettingsSection";

const FILL_BY_SEVERITY: Record<StorageSeverity, string> = {
  calm: "bg-primary",
  warning: "bg-warning",
  danger: "bg-destructive",
};

function Meter({ usage }: { usage: StorageUsage }) {
  const severity = severityOf(usage.localBytes);
  const other = Math.max(0, usage.localBytes - usage.localCacheBytes);
  const pct = (bytes: number) => Math.min(100, (bytes / LOCAL_STORAGE_CAP_BYTES) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink text-body font-medium">Browser storage</span>
        <span className="text-ink-3 text-caption tabular-nums">
          {`${formatBytes(usage.localBytes)} of ~${formatBytes(LOCAL_STORAGE_CAP_BYTES)}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Browser storage used"
        aria-valuemin={0}
        aria-valuemax={LOCAL_STORAGE_CAP_BYTES}
        aria-valuenow={usage.localBytes}
        aria-valuetext={`${formatBytes(usage.localBytes)} of about ${formatBytes(LOCAL_STORAGE_CAP_BYTES)}`}
        className="bg-foreground/10 flex h-2 overflow-hidden rounded-full"
      >
        <span
          className={cn(
            "h-full transition-[width] duration-700 ease-out",
            FILL_BY_SEVERITY[severity],
          )}
          style={{ width: `${pct(usage.localCacheBytes)}%` }}
        />
        <span
          className={cn(
            "h-full opacity-40 transition-[width] duration-700 ease-out",
            FILL_BY_SEVERITY[severity],
          )}
          style={{ width: `${pct(other)}%` }}
        />
      </div>
      <p className="text-ink-3 text-caption">
        {`${formatBytes(usage.localCacheBytes)} cached data · ${formatBytes(other)} preferences`}
      </p>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  detail,
  delay,
  reduced,
}: {
  icon: typeof Images;
  label: string;
  value: string;
  detail: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={{ y: reduced ? 0 : 8 }}
      animate={{ y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.28,
        ease: EASE_OUT,
        delay: reduced ? 0 : delay,
      }}
      className="border-border/60 flex flex-col gap-1 rounded-lg border p-3"
    >
      <span className="text-ink-3 flex items-center gap-1.5 text-caption">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      <span className="text-ink text-lg leading-none font-semibold tabular-nums">{value}</span>
      <span className="text-ink-3 text-micro">{detail}</span>
    </motion.div>
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
      title="Storage"
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
        {failed ? (
          <p key="error" className="text-ink-3 text-caption">
            Storage usage couldn't be measured.
          </p>
        ) : !usage ? (
          <div key="loading" className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ) : (
          <div key="usage" className="flex flex-col gap-4">
            <Meter usage={usage} />
            <div className="grid grid-cols-2 gap-3">
              <Tile
                icon={Images}
                label="Pictures"
                value={usage.imageBytes === null ? "Unknown" : formatBytes(usage.imageBytes)}
                detail={
                  usage.imageBytes === null
                    ? "Could not be measured"
                    : usage.imageCount === 1
                      ? "1 file · no size limit"
                      : `${usage.imageCount} files · no size limit`
                }
                delay={0.05}
                reduced={reduced}
              />
              <Tile
                icon={HardDrive}
                label="Widgets and settings"
                value={usage.chromeBytes === null ? "Unknown" : formatBytes(usage.chromeBytes)}
                detail={
                  usage.chromeBytes === null
                    ? "Available once Lux is installed as an extension"
                    : "No size limit"
                }
                delay={0.11}
                reduced={reduced}
              />
            </div>
            <p className="text-ink-3 text-caption">
              Clearing the cache removes only data your widgets can fetch again — notes, tasks and
              links stay. To remove pictures, use Background above.
            </p>
          </div>
        )}
      </AnimatePresence>
    </SettingsSection>
  );
}
