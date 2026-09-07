import { Fragment } from "react";
import { Kbd } from "@/components/Kbd";

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
            <Kbd key={key} className="mx-0.5">
              {part.slice(1, -1)}
            </Kbd>
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
