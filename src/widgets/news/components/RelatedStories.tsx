import { useState } from "react";
import type { MouseEvent } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpenBehavior } from "@/lib/open-url";
import type { RelatedStory } from "@/widgets/news/types";

export function RelatedStories({
  title,
  related,
  openBehavior,
}: {
  title: string;
  related: RelatedStory[];
  openBehavior: OpenBehavior;
}) {
  const [open, setOpen] = useState(false);
  if (related.length === 0) return null;

  const first = related[0]?.source ?? "";
  const extra = related.length - 1;
  const summary = extra > 0 ? `also on ${first} +${extra}` : `also on ${first}`;

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen((value) => !value);
  };

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${summary} — show the other reports of “${title}”`}
        className="
          press focus-ring text-ink-3 flex min-w-0 cursor-pointer items-center gap-0.5 rounded-sm
          text-caption
          hover:text-ink
        "
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          aria-hidden
          className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <span className="flex flex-col gap-0.5 pl-1">
          {related.map((story) => (
            <a
              key={story.link}
              href={story.link}
              target={openBehavior === "newTab" ? "_blank" : undefined}
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="
                press focus-ring text-ink-3 truncate rounded-sm text-caption
                hover:text-primary
              "
            >
              {story.source}
            </a>
          ))}
        </span>
      )}
    </span>
  );
}
