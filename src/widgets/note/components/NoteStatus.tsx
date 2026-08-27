import { HEADER_LABEL } from "@/widgets/core/chromeStyles";
import { useNote } from "@/widgets/note/useNoteStore";
import { NOTE_MAX_LENGTH } from "@/widgets/note/types";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function NoteStatus() {
  const id = useWidgetInstanceId();
  const { text } = useNote(id);
  const trimmed = text.trim();
  if (!trimmed) return <span className={HEADER_LABEL}>Note</span>;

  const words = trimmed.split(/\s+/).length;
  const chars = text.length;

  const atLimit = chars >= NOTE_MAX_LENGTH;
  const nearLimit = chars >= NOTE_MAX_LENGTH * 0.9;

  return (
    <span className={HEADER_LABEL}>
      {words} {words === 1 ? "word" : "words"} ·{" "}
      {atLimit
        ? "limit reached"
        : nearLimit
          ? `${chars.toLocaleString()} / ${NOTE_MAX_LENGTH.toLocaleString()} chars`
          : `${chars.toLocaleString()} ${chars === 1 ? "char" : "chars"}`}
    </span>
  );
}
