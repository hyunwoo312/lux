import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { enterTween, exitTween } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { NOTE_MAX_LENGTH, type NoteFontSize } from "@/widgets/note/types";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { WidgetContentProps } from "@/widgets/core/types";
import { useNoteEditor } from "@/widgets/note/hooks/useNoteEditor";
import { Button } from "@/components/ui/button";

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
    keepMine,
    useSaved,
  } = useNoteEditor(id);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (justAdded && hydrated) ref.current?.focus();
  }, [justAdded, hydrated, ref]);

  return (
    <div className="relative h-full">
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
          conflict !== null && "pb-28",
        )}
      />
      {conflict !== null && (
        <div
          role="status"
          className="
            bg-background/95 absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-md p-2
          "
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
