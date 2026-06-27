import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { NoteFontSize } from "@/widgets/note/types";
import { useNoteStore } from "@/widgets/note/useNoteStore";

const FONT_SIZE_CLASS: Record<NoteFontSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

export function NoteWidget() {
  const text = useNoteStore((s) => s.text);
  const fontSize = useNoteStore((s) => s.fontSize);
  const setText = useNoteStore((s) => s.setText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const { lastAddedId, clearLastAdded } = useDashboardStore.getState();
    if (lastAddedId === "note") {
      ref.current?.focus();
      clearLastAdded();
    }
  }, []);

  return (
    <textarea
      ref={ref}
      value={text}
      onChange={(event) => setText(event.target.value)}
      placeholder="Write a note…"
      aria-label="Note"
      className={cn(
        `
          h-full w-full resize-none bg-transparent leading-relaxed outline-none
          placeholder:text-muted-foreground/50
        `,
        FONT_SIZE_CLASS[fontSize],
      )}
    />
  );
}
