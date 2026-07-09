import { Fragment } from "react";

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightedTitle({ title, terms }: { title: string; terms: string[] }) {
  if (terms.length === 0) return title;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const segments = title.split(pattern);
  if (segments.length === 1) return title;
  return segments.map((segment, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="text-primary bg-transparent font-semibold">
        {segment}
      </mark>
    ) : (
      <Fragment key={index}>{segment}</Fragment>
    ),
  );
}
