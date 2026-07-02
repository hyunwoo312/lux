import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { NoteFontSize } from "@/widgets/note/types";
import { useNote, useNoteStore } from "@/widgets/note/useNoteStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const FONT_SIZE_CLASS: Record<NoteFontSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

export function NoteWidget() {
  const id = useWidgetInstanceId();
  const { text, fontSize } = useNote(id);
  const setText = useNoteStore((s) => s.setText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const { lastAddedId, clearLastAdded } = useDashboardStore.getState();
    if (lastAddedId === id) {
      ref.current?.focus();
      clearLastAdded();
    }
  }, [id]);

  return (
    <textarea
      ref={ref}
      value={text}
      onChange={(event) => setText(id, event.target.value)}
      placeholder="Write a note…"
      aria-label="Note"
      className={cn(
        `
          block h-full w-full resize-none bg-transparent leading-relaxed outline-none
          placeholder:text-muted-foreground/50
        `,
        FONT_SIZE_CLASS[fontSize],
      )}
    />
  );
}
