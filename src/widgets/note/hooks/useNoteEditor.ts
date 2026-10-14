import type { ChangeEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePersistHydrated } from "@/hooks/usePersistHydrated";
import { useTransientState } from "@/hooks/useTransientState";
import { continueList, toggleCheckbox, type ListEdit } from "@/widgets/note/lib/lists";
import {
  discardNoteDraft,
  hasNoteDraft,
  readNoteDraft,
  saveNoteDraft,
  type NoteDraft,
} from "@/widgets/note/lib/drafts";
import { NOTE_MAX_LENGTH } from "@/widgets/note/types";
import { getNoteData, useNote, useNoteStore } from "@/widgets/note/useNoteStore";
import { usePublishNoteDraft } from "@/widgets/note/hooks/useNoteDraft";
import { formatNote, type NoteEdit, type NoteFormat } from "@/widgets/note/lib/format";

const COMMIT_DELAY_MS = 400;
const OVERFLOW_NOTICE_MS = 4000;

export function useNoteEditor(id: string) {
  const { text, fontSize, updatedAt = 0 } = useNote(id);
  const hydrated = usePersistHydrated(useNoteStore);
  const setText = useNoteStore((state) => state.setText);
  const [recovered] = useState(() => readNoteDraft(id));
  const [value, setValue] = useState(recovered?.text ?? text);
  usePublishNoteDraft(id, value);
  const [conflict, setConflict] = useState<string | null>(null);
  const [dropped, reportDropped] = useTransientState(0, OVERFLOW_NOTICE_MS);
  const ref = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const committed = useRef({ text, updatedAt });
  const pending = useRef<NoteDraft | undefined>(recovered);
  const recovering = useRef(Boolean(recovered));
  const conflictRef = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const reportConflict = useCallback(
    (saved: { text: string; updatedAt?: number }) => {
      window.clearTimeout(timer.current);
      committed.current = { text: saved.text, updatedAt: saved.updatedAt ?? 0 };
      conflictRef.current = true;
      setConflict(saved.text);
      const draft = pending.current;
      if (draft && !draft.conflict)
        pending.current = saveNoteDraft(id, valueRef.current, draft.baseText, draft.baseAt, true);
    },
    [id],
  );

  const commit = useCallback(() => {
    window.clearTimeout(timer.current);
    if (conflictRef.current) return;
    const saved = getNoteData(id);
    const draft = pending.current;
    if (
      draft &&
      saved.text !== draft.text &&
      (saved.text !== draft.baseText || (saved.updatedAt ?? 0) > draft.at)
    ) {
      reportConflict(saved);
      return;
    }
    if (valueRef.current === saved.text) return;
    const at = draft?.at ?? Date.now();
    committed.current = { text: valueRef.current, updatedAt: at };
    setText(id, valueRef.current, at);
  }, [id, setText, reportConflict]);

  useEffect(() => commit, [commit]);

  useEffect(() => {
    if (!hydrated) return;
    const draft = pending.current;
    if (draft && hasNoteDraft(id, draft)) {
      if (
        text !== draft.text &&
        (draft.conflict || text !== draft.baseText || updatedAt > draft.at)
      ) {
        reportConflict({ text, updatedAt });
        return;
      }
      committed.current = { text, updatedAt };
      if (recovering.current && text !== draft.text) {
        recovering.current = false;
        commit();
      }
      return;
    }
    pending.current = undefined;
    conflictRef.current = false;
    setConflict(null);
    committed.current = { text, updatedAt };
    setValue(text);
  }, [id, text, updatedAt, hydrated, commit, reportConflict]);

  const schedule = (next: string) => {
    valueRef.current = next;
    setValue(next);
    pending.current = saveNoteDraft(
      id,
      next,
      committed.current.text,
      committed.current.updatedAt,
      conflictRef.current,
    );
    window.clearTimeout(timer.current);
    if (!conflictRef.current) timer.current = window.setTimeout(commit, COMMIT_DELAY_MS);
  };

  const limitFor = () => Math.max(NOTE_MAX_LENGTH, valueRef.current.length);
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    const limit = limitFor();
    if (next.length > limit) {
      reportDropped(next.length - limit);
      schedule(next.slice(0, limit));
      return;
    }
    schedule(next);
  };

  const applyEdit = (edit: NoteEdit) => {
    const field = ref.current;
    field?.focus({ preventScroll: true });
    if (edit.text.length > limitFor()) {
      reportDropped(edit.text.length - limitFor());
      return;
    }
    if (field) {
      let start = 0;
      while (start < field.value.length && field.value[start] === edit.text[start]) start++;
      let end = field.value.length;
      let nextEnd = edit.text.length;
      while (end > start && nextEnd > start && field.value[end - 1] === edit.text[nextEnd - 1]) {
        end--;
        nextEnd--;
      }
      field.setSelectionRange(start, end);
      document.execCommand?.("insertText", false, edit.text.slice(start, nextEnd));
    }
    schedule(edit.text);
    field?.setSelectionRange(edit.start, edit.end);
    requestAnimationFrame(() => field?.setSelectionRange(edit.start, edit.end));
  };

  const format = (style: NoteFormat) => {
    const field = ref.current;
    if (!field || !hydrated) return;
    applyEdit(formatNote(valueRef.current, field.selectionStart, field.selectionEnd, style));
  };

  const applyListEdit = (edit: ListEdit) =>
    applyEdit({ text: edit.text, start: edit.caret, end: edit.caret });

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const field = event.currentTarget;
    if (event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey) return;
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
      const style =
        event.key.toLowerCase() === "b"
          ? "bold"
          : event.key.toLowerCase() === "i"
            ? "italic"
            : event.key.toLowerCase() === "k"
              ? "link"
              : null;
      if (style) {
        event.preventDefault();
        format(style);
        return;
      }
    }
    if (field.selectionStart !== field.selectionEnd) return;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      const edit = toggleCheckbox(field.value, field.selectionStart);
      if (!edit) return;
      event.preventDefault();
      applyListEdit(edit);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      const edit = continueList(field.value, field.selectionStart);
      if (!edit) return;
      event.preventDefault();
      applyListEdit(edit);
    }
  };

  const keepMine = () => {
    const saved = getNoteData(id);
    committed.current = { text: saved.text, updatedAt: saved.updatedAt ?? 0 };
    pending.current = saveNoteDraft(id, valueRef.current, saved.text, saved.updatedAt ?? 0);
    conflictRef.current = false;
    setConflict(null);
    commit();
  };

  const useSaved = () => {
    if (pending.current) discardNoteDraft(id, pending.current);
    pending.current = undefined;
    conflictRef.current = false;
    setConflict(null);
    const saved = getNoteData(id);
    committed.current = { text: saved.text, updatedAt: saved.updatedAt ?? 0 };
    valueRef.current = saved.text;
    setValue(saved.text);
  };

  return {
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
  };
}
