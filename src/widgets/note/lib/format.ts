export type NoteFormat =
  | "bold"
  | "italic"
  | "code"
  | "heading"
  | "bullet"
  | "number"
  | "task"
  | "quote"
  | "link";
export type NoteEdit = { text: string; start: number; end: number };

export function formatNote(text: string, start: number, end: number, format: NoteFormat): NoteEdit {
  const selected = text.slice(start, end);
  if (selected.includes("\n") && ["bold", "italic", "code", "link"].includes(format)) {
    const marker = format === "bold" ? "**" : format === "italic" ? "*" : "`";
    const lines = selected.split("\n");
    const remove =
      format !== "link" &&
      lines.every((line) => !line || (line.startsWith(marker) && line.endsWith(marker)));
    const body = lines
      .map((line) =>
        !line
          ? line
          : remove
            ? line.slice(marker.length, -marker.length)
            : format === "link"
              ? `[${line}](https://)`
              : marker + line + marker,
      )
      .join("\n");
    return { text: text.slice(0, start) + body + text.slice(end), start, end: start + body.length };
  }
  if (format === "bold" || format === "italic" || format === "code" || format === "link") {
    const marker = format === "bold" ? "**" : format === "italic" ? "*" : "`";
    if (format === "link") {
      const label = selected || "link text";
      const addition = `[${label}](https://)`;
      return {
        text: text.slice(0, start) + addition + text.slice(end),
        start: start + label.length + 3,
        end: start + addition.length - 1,
      };
    }
    if (
      text.slice(start - marker.length, start) === marker &&
      text.slice(end, end + marker.length) === marker
    ) {
      return {
        text: text.slice(0, start - marker.length) + selected + text.slice(end + marker.length),
        start: start - marker.length,
        end: end - marker.length,
      };
    }
    const body = selected || (format === "code" ? "code" : "text");
    return {
      text: text.slice(0, start) + marker + body + marker + text.slice(end),
      start: start + marker.length,
      end: start + marker.length + body.length,
    };
  }
  const from = start === 0 ? 0 : text.lastIndexOf("\n", start - 1) + 1;
  const next = text.indexOf("\n", end > start && text[end - 1] === "\n" ? end - 1 : end);
  const to = next === -1 ? text.length : next;
  const lines = text.slice(from, to).split("\n");
  const prefix =
    format === "heading"
      ? "## "
      : format === "bullet"
        ? "- "
        : format === "task"
          ? "- [ ] "
          : format === "quote"
            ? "> "
            : "1. ";
  const remove = lines.every((line) =>
    format === "number" ? /^\d+[.)] /.test(line) : line.startsWith(prefix),
  );
  const body = lines
    .map((line, index) =>
      remove
        ? format === "number"
          ? line.replace(/^\d+[.)] /, "")
          : line.slice(prefix.length)
        : (format === "number" ? `${index + 1}. ` : prefix) + line,
    )
    .join("\n");
  return {
    text: text.slice(0, from) + body + text.slice(to),
    start: from,
    end: from + body.length,
  };
}
