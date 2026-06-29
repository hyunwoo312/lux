import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { CHANGE_TYPE_LABEL, CHANGE_TYPE_ORDER, RELEASES, type Release } from "@/changelog/releases";
import { useChangelogStore } from "@/changelog/useChangelogStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangelogDialog({ open, onOpenChange }: Props) {
  const markSeen = useChangelogStore((s) => s.markSeen);

  useEffect(() => {
    if (open) markSeen();
  }, [open, markSeen]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          glass-panel flex max-h-[80dvh] w-[min(34rem,calc(100vw-2rem))] flex-col gap-0
          overflow-hidden bg-[var(--glass-bg-thick)] p-0
        "
      >
        <header className="border-border/50 flex flex-col gap-1 border-b px-6 py-5">
          <DialogTitle className="text-base font-semibold">What&apos;s new</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Recent updates to Lux.
          </DialogDescription>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-2">
          {RELEASES.map((release, index) => (
            <ReleaseSection key={release.version} release={release} latest={index === 0} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseSection({ release, latest }: { release: Release; latest: boolean }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(latest);

  return (
    <section className="border-border/40 border-b py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="
          hover:bg-foreground/5
          focus-visible:ring-ring
          -mx-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none
          focus-visible:ring-2
        "
      >
        <h3 className="text-sm font-semibold tabular-nums">v{release.version}</h3>
        {latest && (
          <span
            className="
              bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-2xs font-medium
            "
          >
            Latest
          </span>
        )}
        <span className="text-muted-foreground text-xs">{formatDate(release.date)}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground ml-auto size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.25, ease: EASE_OUT_EXPO }}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-3 pt-3">
          {CHANGE_TYPE_ORDER.map((type) => {
            const items = release.changes.filter((change) => change.type === type);
            if (items.length === 0) return null;
            return (
              <div key={type} className="flex flex-col gap-1.5">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {CHANGE_TYPE_LABEL[type]}
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {items.map((change) => (
                    <li key={change.text} className="text-foreground/90 flex gap-2 text-sm">
                      <span aria-hidden className="text-muted-foreground/60 select-none">
                        •
                      </span>
                      <span>{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}
