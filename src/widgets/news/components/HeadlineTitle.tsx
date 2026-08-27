import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { HighlightedTitle } from "@/widgets/news/components/HighlightedTitle";

export function HeadlineTitle({
  title,
  terms,
  isNew,
  className,
}: {
  title: string;
  terms: string[];
  isNew: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [title]);

  const body = (
    <span ref={ref} className={cn("line-clamp-2", className)}>
      {isNew && (
        <>
          <span
            className="bg-primary mr-1.5 mb-px inline-block size-1.5 rounded-full"
            aria-hidden
          />
          <span className="sr-only">New</span>
        </>
      )}
      <HighlightedTitle title={title} terms={terms} />
    </span>
  );

  if (!clamped) return body;
  return (
    <Tooltip content={title} side="bottom" prose>
      {body}
    </Tooltip>
  );
}
