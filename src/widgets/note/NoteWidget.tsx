import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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

const COMMIT_DELAY_MS = 400;

export function NoteWidget() {
  const id = useWidgetInstanceId();
  const { text, fontSize } = useNote(id);
  const setText = useNoteStore((s) => s.setText);
  const ref = useRef<HTMLTextAreaElement>(null);

  const [value, setValue] = useState(text);
  const valueRef = useRef(value);
  valueRef.current = value;
  const committedRef = useRef(text);
  const commitTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (text !== committedRef.current) {
      committedRef.current = text;
      setValue(text);
    }
  }, [text]);

  const commit = useCallback(() => {
    window.clearTimeout(commitTimer.current);
    if (valueRef.current === committedRef.current) return;
    committedRef.current = valueRef.current;
    setText(id, valueRef.current);
  }, [id, setText]);

  useEffect(() => commit, [commit]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(commit, COMMIT_DELAY_MS);
  };

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
      value={value}
      onChange={handleChange}
      onBlur={commit}
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
