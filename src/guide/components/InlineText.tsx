import { Fragment } from "react";

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

export function InlineText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, index) => {
        const key = `${index}-${part}`;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={key} className="text-ink font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <kbd
              key={key}
              className="
                border-border/60 bg-card text-ink mx-0.5 rounded-xs border px-1.5 py-0.5
                text-caption font-medium
              "
            >
              {part.slice(1, -1)}
            </kbd>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={key}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={key}>{part}</Fragment>;
      })}
    </>
  );
}
