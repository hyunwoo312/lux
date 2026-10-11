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

const COMMIT_DELAY_MS = 400;
const OVERFLOW_NOTICE_MS = 4000;

export function useNoteEditor(id: string) {
  const { text, fontSize, updatedAt = 0 } = useNote(id);
  const hydrated = usePersistHydrated(useNoteStore);
  const setText = useNoteStore((state) => state.setText);
  const [recovered] = useState(() => readNoteDraft(id));
  const [value, setValue] = useState(recovered?.text ?? text);
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

  const applyEdit = (edit: ListEdit) => {
    if (edit.text.length > limitFor()) {
      reportDropped(edit.text.length - limitFor());
      return;
    }
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
    keepMine,
    useSaved,
  };
}
