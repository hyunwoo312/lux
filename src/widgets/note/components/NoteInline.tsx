import type { ReactNode } from "react";

const TOKEN =
  /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|~~[^~\n]+~~|(?<!!)\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;

export function NoteInline({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(TOKEN)) {
    const token = match[0];
    nodes.push(text.slice(cursor, match.index));
    const key = match.index;
    if (token.startsWith("`"))
      nodes.push(
        <code key={key} className="bg-foreground/5 rounded px-1 py-0.5 font-mono text-caption">
          {token.slice(1, -1)}
        </code>,
      );
    else if (token.startsWith("**"))
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    else if (token.startsWith("*")) nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    else if (token.startsWith("~~")) nodes.push(<s key={key}>{token.slice(2, -2)}</s>);
    else {
      const separator = token.lastIndexOf("](");
      nodes.push(
        <a
          key={key}
          href={token.slice(separator + 2, -1)}
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-ink focus-ring rounded-sm underline decoration-primary/40 underline-offset-2
            hover:decoration-primary
          "
        >
          {token.slice(1, separator)}
        </a>,
      );
    }
    cursor = match.index + token.length;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}
