import { CloudOff, Star } from "lucide-react";
import { sourceTab } from "@/widgets/news/lib/news";
import type { NewsSource } from "@/widgets/news/types";

const NOTICE_CLASS = "text-ink-3 flex items-center gap-1.5 px-2 pb-1.5 text-caption";

type NewsNoticesProps = {
  missingSources: NewsSource[];
  refresh: () => void;
  highlightCount: number;
  newCount: number;
};

export function NewsNotices({
  missingSources,
  refresh,
  highlightCount,
  newCount,
}: NewsNoticesProps) {
  return (
    <>
      {missingSources.length > 0 && (
        <p className={NOTICE_CLASS}>
          <CloudOff className="size-3 shrink-0" aria-hidden />
          {missingSources.map(sourceTab).join(", ")} didn’t load
          <button
            type="button"
            onClick={refresh}
            className="press focus-ring text-ink-2 ml-auto cursor-pointer rounded-sm hover:text-ink"
          >
            Retry
          </button>
        </p>
      )}
      {highlightCount > 0 && (
        <p className={NOTICE_CLASS}>
          <Star className="text-primary size-3 shrink-0" aria-hidden />
          {highlightCount} matching your keywords
        </p>
      )}
      {newCount > 0 && (
        <div className={NOTICE_CLASS}>
          <span className="bg-primary size-1.5 rounded-full" aria-hidden />
          {newCount} new since your last visit
        </div>
      )}
    </>
  );
}
