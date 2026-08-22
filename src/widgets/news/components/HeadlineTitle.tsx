import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { HighlightedTitle } from "@/widgets/news/components/HighlightedTitle";
import { useIsClamped } from "@/widgets/news/hooks/useIsClamped";

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
  const [ref, clamped] = useIsClamped<HTMLSpanElement>(title);

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
    <Tooltip content={title} side="bottom" solid>
      {body}
    </Tooltip>
  );
}
