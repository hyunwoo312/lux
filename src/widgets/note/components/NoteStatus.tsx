import { HEADER_LABEL } from "@/widgets/core/BaseWidget";
import { useNote } from "@/widgets/note/useNoteStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function NoteStatus() {
  const id = useWidgetInstanceId();
  const { text } = useNote(id);
  const trimmed = text.trim();
  if (!trimmed) return <span className={HEADER_LABEL}>Note</span>;

  const words = trimmed.split(/\s+/).length;
  const chars = text.length;

  return (
    <span className={HEADER_LABEL}>
      {words} {words === 1 ? "word" : "words"} · {chars} {chars === 1 ? "char" : "chars"}
    </span>
  );
}
