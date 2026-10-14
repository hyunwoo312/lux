import { memo, type ReactNode } from "react";
import { Check, Square } from "lucide-react";
import { NoteInline } from "@/widgets/note/components/NoteInline";

const HEADING = /^(#{1,6}) (.+)$/;
const LIST = /^\s*(?:([-*+]) |(\d+)[.)] )(.+)$/;
const BLOCK = /^(#{1,6} |>|\s*(?:[-*+] |\d+[.)] )|```|---+$)/;

export const NotePreview = memo(function NotePreview({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (!line.trim()) continue;
    const key = index;
    if (/^```[^`]*$/.test(line)) {
      let end = index + 1;
      while (end < lines.length && lines[end] !== "```") end++;
      if (end < lines.length) {
        blocks.push(
          <pre
            key={key}
            className="
              bg-foreground/5 scroll-fade overflow-x-auto rounded-md p-2.5 font-mono text-caption
              leading-relaxed
            "
          >
            <code>{lines.slice(index + 1, end).join("\n")}</code>
          </pre>,
        );
        index = end;
        continue;
      }
    }
    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const Heading =
        level === 1
          ? "h1"
          : level === 2
            ? "h2"
            : level === 3
              ? "h3"
              : level === 4
                ? "h4"
                : level === 5
                  ? "h5"
                  : "h6";
      blocks.push(
        <Heading
          key={key}
          className={
            level === 1
              ? "text-heading font-semibold leading-snug"
              : level === 2
                ? "text-title font-semibold leading-snug"
                : "text-body-lg font-semibold leading-snug"
          }
        >
          <NoteInline text={heading[2] ?? ""} />
        </Heading>,
      );
    } else if (/^---+$/.test(line)) blocks.push(<hr key={key} className="border-border" />);
    else if (line.startsWith(">")) {
      const quotes = [line.replace(/^> ?/, "")];
      while (lines[index + 1]?.startsWith(">"))
        quotes.push((lines[++index] ?? "").replace(/^> ?/, ""));
      blocks.push(
        <blockquote
          key={key}
          className="border-primary/40 text-ink-2 border-l-2 pl-3 whitespace-pre-wrap"
        >
          <NoteInline text={quotes.join("\n")} />
        </blockquote>,
      );
    } else if (LIST.test(line)) {
      const numbered = /^\s*\d/.test(line);
      const items: ReactNode[] = [];
      let first = 1;
      do {
        const match = LIST.exec(lines[index] ?? "");
        const body = match?.[3] ?? "";
        if (!items.length) first = Number(match?.[2] ?? 1);
        const task = /^\[([ xX])\] (.*)$/.exec(body);
        items.push(
          <li key={index} className={task ? "flex gap-2" : "pl-0.5"}>
            {task ? (
              <>
                <span
                  role="img"
                  aria-label={task[1] === " " ? "Unchecked" : "Checked"}
                  className="text-ink-3 mt-0.5 shrink-0"
                >
                  {task[1] === " " ? (
                    <Square className="size-4" />
                  ) : (
                    <Check className="text-primary size-4" />
                  )}
                </span>
                <span className={task[1] === " " ? "" : "text-ink-2 line-through"}>
                  <NoteInline text={task[2] ?? ""} />
                </span>
              </>
            ) : (
              <NoteInline text={body} />
            )}
          </li>,
        );
        if (
          !LIST.test(lines[index + 1] ?? "") ||
          numbered !== /^\s*\d/.test(lines[index + 1] ?? "")
        )
          break;
        index++;
      } while (index < lines.length);
      blocks.push(
        numbered ? (
          <ol key={key} start={first} className="list-decimal space-y-1 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={key} className="list-disc space-y-1 pl-5">
            {items}
          </ul>
        ),
      );
    } else {
      const paragraph = [line];
      while (lines[index + 1]?.trim() && !BLOCK.test(lines[index + 1] ?? ""))
        paragraph.push(lines[++index] ?? "");
      blocks.push(
        <p key={key} className="whitespace-pre-wrap">
          <NoteInline text={paragraph.join("\n")} />
        </p>,
      );
    }
  }
  return (
    <article
      aria-label="Note reading preview"
      className="
        text-ink mx-auto flex max-w-[65ch] flex-col gap-3 leading-relaxed [overflow-wrap:anywhere]
      "
    >
      {blocks.length ? (
        blocks
      ) : (
        <p className="text-ink-3">Nothing to read yet. Write a note in Edit.</p>
      )}
    </article>
  );
});
