import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { enterTween, exitTween } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { NOTE_MAX_LENGTH, type NoteFontSize } from "@/widgets/note/types";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { WidgetContentProps } from "@/widgets/core/types";
import { useNoteEditor } from "@/widgets/note/hooks/useNoteEditor";
import { Button } from "@/components/ui/button";
import { NoteTools } from "@/widgets/note/components/NoteTools";
import { NotePreview } from "@/widgets/note/components/NotePreview";

const FONT_SIZE_CLASS: Record<NoteFontSize, string> = {
  sm: "text-body",
  base: "text-body-lg",
  lg: "text-title",
};

export function NoteWidget({ justAdded }: WidgetContentProps) {
  const id = useWidgetInstanceId();
  const {
    ref,
    value,
    fontSize,
    hydrated,
    dropped,
    conflict,
    commit,
    handleChange,
    handleKeyDown,
    format,
    keepMine,
    useSaved,
  } = useNoteEditor(id);
  const reduced = useReducedMotion();
  const [reading, setReading] = useState(false);
  const [lastRead, setLastRead] = useState("");
  const preview = useRef<HTMLDivElement>(null);
  const changeMode = (next: boolean) => {
    if (next === reading) return;
    if (reading) setLastRead(value);
    commit();
    setReading(next);
    requestAnimationFrame(() =>
      (next ? preview.current : ref.current)?.focus({ preventScroll: true }),
    );
  };
  useEffect(() => {
    if (justAdded && hydrated) ref.current?.focus();
  }, [justAdded, hydrated, ref]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <NoteTools
        reading={reading}
        disabled={!hydrated}
        onModeChange={changeMode}
        onFormat={format}
      />
      <div className="relative min-h-0 flex-1">
        <motion.div
          initial={false}
          animate={{ opacity: reading ? 0 : 1 }}
          transition={enterTween(reduced, "fast")}
          hidden={reading}
          className={cn("absolute inset-0", reading && "hidden")}
        >
          <textarea
            ref={ref}
            disabled={!hydrated}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            placeholder="Write a note…"
            aria-label="Note"
            className={cn(
              `
                scroll-fade focus-ring block h-full w-full max-w-[70ch] resize-none rounded-lg
                bg-transparent leading-relaxed
                placeholder:text-ink-3
              `,
              FONT_SIZE_CLASS[fontSize],
              "mx-auto px-0.5",
            )}
          />
        </motion.div>
        <motion.div
          ref={preview}
          tabIndex={-1}
          role="region"
          aria-label="Read note"
          hidden={!reading}
          initial={false}
          animate={{ opacity: reading ? 1 : 0 }}
          transition={enterTween(reduced, "fast")}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              changeMode(false);
            }
          }}
          className={cn(
            "scroll-fade focus-ring absolute inset-0 overflow-y-auto rounded-md px-0.5 py-1",
            FONT_SIZE_CLASS[fontSize],
            !reading && "hidden",
          )}
        >
          <NotePreview text={reading ? value : lastRead} />
        </motion.div>
      </div>
      {conflict !== null && (
        <div
          role="status"
          className="border-border bg-card mt-2 flex shrink-0 flex-col gap-2 rounded-md border p-2"
        >
          <p className="text-caption text-ink">
            This note changed in another tab. Keep your edits or use the saved version.
          </p>
          <div className="flex gap-2">
            <Button size="xs" variant="secondary" onClick={keepMine}>
              Keep mine
            </Button>
            <Button size="xs" variant="ghost" onClick={useSaved}>
              Use saved
            </Button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {dropped > 0 && (
          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: enterTween(reduced, "fast") }}
            exit={{ opacity: 0, y: reduced ? 0 : 8, transition: exitTween(reduced, "fast") }}
            role="status"
            className="
              border-border bg-background/95 text-ink pointer-events-none absolute right-0 bottom-0
              rounded-md border px-2 py-1 text-caption shadow-elev-2
            "
          >
            {dropped.toLocaleString()} character{dropped === 1 ? "" : "s"} didn’t fit — the note
            holds {NOTE_MAX_LENGTH.toLocaleString()}.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
