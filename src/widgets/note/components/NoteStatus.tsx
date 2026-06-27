import { HEADER_LABEL } from "@/widgets/core/BaseWidget";
import { useNoteStore } from "@/widgets/note/useNoteStore";

export function NoteStatus() {
  const text = useNoteStore((s) => s.text);
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
