import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { fade } from "@/lib/motion";
import { ArrowUpRight } from "lucide-react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { HeadlineTitle } from "@/widgets/news/components/HeadlineTitle";
import { formatRelativeTime } from "@/lib/relative-time";
import { isHttpUrl, type OpenBehavior } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

type Props = {
  item: NewsItem;
  now: number;
  openBehavior: OpenBehavior;
  loadImages: boolean;
  highlightTerms: string[];
  onRead: () => void;
};
export function StoryPreviewBody({
  item,
  now,
  openBehavior,
  loadImages,
  highlightTerms,
  onRead,
}: Props) {
  const reduced = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <motion.div
      {...fade(reduced, "fast")}
      className="scroll-fade flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 py-1"
    >
      <div className="text-ink-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
        <span className="min-w-0 break-words">{item.source}</span>
        {item.publishedAt !== null && (
          <time
            dateTime={new Date(item.publishedAt).toISOString()}
            title={new Date(item.publishedAt).toLocaleString()}
          >
            · {formatRelativeTime(item.publishedAt, now)}
          </time>
        )}
      </div>
      <h3 className="text-ink text-title font-medium leading-snug break-words">
        <HeadlineTitle
          title={item.title}
          terms={highlightTerms}
          isNew={false}
          className="line-clamp-none"
        />
      </h3>
      <div className="flex flex-col gap-1.5">
        <span className="text-ink-3 text-micro font-medium">Feed excerpt</span>
        <p className="text-ink-2 text-body leading-relaxed break-words">
          {item.dek ||
            "This feed does not include an excerpt. Open the publisher for the full story."}
        </p>
      </div>
      {loadImages && item.image && !imageFailed && (
        <RemoteImage
          src={item.image}
          alt=""
          aria-hidden
          onError={() => setImageFailed(true)}
          className="max-h-36 w-full shrink-0 rounded-md object-cover"
        />
      )}
      {item.related.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border/50 pt-2">
          <span className="text-ink-3 text-micro font-medium">Also reported by</span>
          {item.related
            .filter((story) => isHttpUrl(story.link))
            .map((story) => (
              <a
                key={story.link}
                href={story.link}
                rel="noreferrer"
                target={openBehavior === "newTab" ? "_blank" : undefined}
                onClick={onRead}
                onAuxClick={onRead}
                className="
                  focus-ring text-ink-2
                  hover:text-ink
                  flex items-center justify-between gap-2 rounded-md py-1 text-caption
                "
              >
                <span className="min-w-0 break-words">{story.source}</span>
                <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
              </a>
            ))}
        </div>
      )}
    </motion.div>
  );
}
