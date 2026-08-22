import type { ChangeEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { continueList, toggleCheckbox, type ListEdit } from "@/widgets/note/lib/lists";
import { NOTE_MAX_LENGTH, type NoteFontSize } from "@/widgets/note/types";
import { useNote, useNoteStore } from "@/widgets/note/useNoteStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const FONT_SIZE_CLASS: Record<NoteFontSize, string> = {
  sm: "text-body",
  base: "text-body-lg",
  lg: "text-title",
};

const COMMIT_DELAY_MS = 400;
const OVERFLOW_NOTICE_MS = 4000;

export function NoteWidget() {
  const id = useWidgetInstanceId();
  const { text, fontSize } = useNote(id);
  const setText = useNoteStore((s) => s.setText);
  const ref = useRef<HTMLTextAreaElement>(null);

  const [value, setValue] = useState(text);
  const [dropped, setDropped] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const committedRef = useRef(text);
  const commitTimer = useRef<number | undefined>(undefined);
  const noticeTimer = useRef<number | undefined>(undefined);

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
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    const { lastAddedId, clearLastAdded } = useDashboardStore.getState();
    if (lastAddedId === id) {
      ref.current?.focus();
      clearLastAdded();
    }
  }, [id]);

  const schedule = (next: string) => {
    setValue(next);
    window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(commit, COMMIT_DELAY_MS);
  };

  const reportDropped = (count: number) => {
    setDropped(count);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setDropped(0), OVERFLOW_NOTICE_MS);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    if (next.length > NOTE_MAX_LENGTH) {
      reportDropped(next.length - NOTE_MAX_LENGTH);
      schedule(next.slice(0, NOTE_MAX_LENGTH));
      return;
    }
    schedule(next);
  };

  const applyEdit = (edit: ListEdit) => {
    schedule(edit.text);
    requestAnimationFrame(() => ref.current?.setSelectionRange(edit.caret, edit.caret));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const field = event.currentTarget;
    if (field.selectionStart !== field.selectionEnd) return;

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      const edit = toggleCheckbox(field.value, field.selectionStart);
      if (!edit) return;
      event.preventDefault();
      applyEdit(edit);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      const edit = continueList(field.value, field.selectionStart);
      if (!edit) return;
      event.preventDefault();
      applyEdit(edit);
    }
  };

  return (
    <div className="relative h-full">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder="Write a note…"
        aria-label="Note"
        className={cn(
          `
            scroll-fade block h-full w-full max-w-[70ch] resize-none bg-transparent leading-relaxed
            outline-none
            placeholder:text-ink-4
          `,
          FONT_SIZE_CLASS[fontSize],
        )}
      />
      {dropped > 0 && (
        <p
          role="status"
          className="
            border-border bg-background/95 text-ink pointer-events-none absolute right-0 bottom-0
            rounded-md border px-2 py-1 text-caption shadow-md
          "
        >
          {dropped.toLocaleString()} characters didn’t fit — the note holds{" "}
          {NOTE_MAX_LENGTH.toLocaleString()}.
        </p>
      )}
    </div>
  );
}
