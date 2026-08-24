import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT, SPRING_CRISP } from "@/lib/motion";
import { TYPE } from "@/lib/type";
import {
  CHANGE_TYPE_LABEL,
  groupByArea,
  highlightsOf,
  RELEASES,
  type ChangeType,
  type Release,
  type ReleaseChange,
} from "@/changelog/releases";
import { useChangelogStore } from "@/changelog/useChangelogStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NEWEST_VERSION = RELEASES[0]?.version ?? "";

const SECTION_CHIP = `
  self-start rounded-sm px-2.5 py-1 text-caption font-bold tracking-wider uppercase
`;

const TYPE_DOT: Record<ChangeType, string> = {
  added: "bg-success",
  changed: "bg-info",
  fixed: "bg-warning",
};

export function ChangelogDialog({ open, onOpenChange }: Props) {
  const markSeen = useChangelogStore((s) => s.markSeen);
  const [version, setVersion] = useState(NEWEST_VERSION);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (!open) return;
    markSeen();
    setVersion(NEWEST_VERSION);
  }, [open, markSeen]);

  const release = RELEASES.find((entry) => entry.version === version) ?? RELEASES[0];
  const isNewest = release?.version === NEWEST_VERSION;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent layout="flush" className="h-[80dvh] w-[min(46rem,calc(100vw-2rem))]">
        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Releases"
            className="
              border-edge-2 bg-surface-2
              dark:bg-surface-raised
              flex w-52 shrink-0 flex-col border-r
            "
          >
            <p className={cn(TYPE.eyebrow, "mx-2 px-2.5 pt-5 pb-3")}>Release history</p>
            <div className="scroll-fade flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-5">
              {RELEASES.map((entry) => {
                const active = entry.version === release?.version;
                return (
                  <button
                    key={entry.version}
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => setVersion(entry.version)}
                    className={cn(
                      `
                        press-row focus-ring relative flex w-full shrink-0 cursor-pointer flex-col
                        items-start rounded-lg px-2.5 py-2 text-left transition-colors
                      `,
                      active ? "text-ink" : "text-ink-3 hover:bg-accent/50 hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="changelog-active-release"
                        className="bg-primary/12 ring-primary/25 absolute inset-0 rounded-lg ring-1"
                        transition={reduced ? { duration: 0 } : SPRING_CRISP}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <span
                        className={cn(
                          "text-body tabular-nums",
                          active ? "font-semibold" : "font-medium",
                        )}
                      >
                        v{entry.version}
                      </span>
                      {entry.version === NEWEST_VERSION && <CurrentTag />}
                    </span>
                    <span className="text-ink-4 relative z-10 text-caption">
                      {formatDate(entry.date, "short")}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-edge-2 flex flex-col gap-2 border-b px-6 pt-4 pb-6">
              <DialogTitle className="text-display-sm pr-10 font-extrabold tracking-tight">
                Version {release?.version}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-3">
                {isNewest && <CurrentTag />}
                <span className="text-ink-3 text-body">
                  Published {release ? formatDate(release.date, "long") : ""}
                </span>
              </div>
              <DialogDescription className="sr-only">{release?.summary}</DialogDescription>
            </header>

            <div className="scroll-fade scrollbar-inset-b min-h-0 flex-1 overflow-y-auto px-6 py-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={release?.version}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: reduced ? 0 : DURATION.instant } }}
                  transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
                  className="flex flex-col gap-8"
                >
                  {release && <ReleaseBody release={release} showcase={isNewest} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseBody({ release, showcase }: { release: Release; showcase: boolean }) {
  const highlights = showcase ? highlightsOf(release) : [];
  const rest = showcase
    ? release.changes.filter((change) => change.highlight !== true)
    : release.changes;

  return (
    <>
      {highlights.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className={cn(SECTION_CHIP, "bg-primary text-primary-foreground")}>Highlights</h3>
          <ul className="flex flex-col gap-4">
            {highlights.map((change) => (
              <li key={change.text} className="flex flex-col gap-0.5">
                <span className={TYPE.eyebrow}>{change.area}</span>
                <span className="text-ink text-body-lg">{change.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groupByArea(rest).map(({ area, changes }) => (
        <section key={area} className="flex flex-col gap-4">
          <h3 className={cn(SECTION_CHIP, "bg-accent text-ink-2")}>{area}</h3>
          <ul className="flex flex-col gap-3">
            {changes.map((change) => (
              <ChangeRow key={change.text} change={change} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function CurrentTag() {
  return (
    <span
      className="
        bg-live/15 ring-live/25 text-ink inline-flex shrink-0 items-center gap-1.5 rounded-sm px-1.5
        py-0.5 text-micro font-semibold ring-1
      "
    >
      <span aria-hidden className="bg-live size-1.5 shrink-0 rounded-full" />
      Current
    </span>
  );
}

function ChangeRow({ change }: { change: ReleaseChange }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex w-20 shrink-0 items-center justify-between gap-2">
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TYPE_DOT[change.type])} />
        <span className="text-ink-4 text-micro font-semibold tracking-wider uppercase">
          {CHANGE_TYPE_LABEL[change.type]}
        </span>
      </span>
      <span className="text-ink min-w-0 text-body">{change.text}</span>
    </li>
  );
}

function formatDate(iso: string, month: "short" | "long"): string {
  const [year, monthIndex, day] = iso.split("-").map(Number);
  if (!year || !monthIndex || !day) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month,
    day: "numeric",
  }).format(new Date(year, monthIndex - 1, day));
}
