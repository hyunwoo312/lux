import { useState } from "react";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { HeadlineMeta } from "@/widgets/news/components/HeadlineMeta";
import { HighlightedTitle } from "@/widgets/news/components/HighlightedTitle";
import { SOURCE_ICONS } from "@/widgets/news/components/sourceIcons";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

export function HeadlineTile({
  item,
  now,
  openBehavior,
  withSource,
  isRead,
  isNew,
  highlightTerms,
  onRead,
}: {
  item: NewsItem;
  now: number;
  openBehavior: OpenBehavior;
  withSource: boolean;
  isRead: boolean;
  isNew: boolean;
  highlightTerms: string[];
  onRead: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const hasImage = item.image !== null && !imageFailed;
  const PlaceholderIcon = item.sourceKey ? SOURCE_ICONS[item.sourceKey] : Newspaper;

  const tile = (
    <a
      href={item.link}
      target={openBehavior === "newTab" ? "_blank" : undefined}
      rel="noreferrer"
      onClick={onRead}
      onAuxClick={onRead}
      className="group bg-foreground/[0.04] relative block aspect-[2/1] overflow-hidden rounded-lg"
    >
      {hasImage ? (
        <img
          src={item.image ?? undefined}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          className={cn(
            `
              absolute inset-0 size-full object-cover transition-transform duration-300
              group-hover:scale-105
              motion-reduce:transition-none
            `,
            isRead && "opacity-50",
          )}
        />
      ) : (
        <PlaceholderIcon className="text-muted-foreground/40 absolute top-3 right-3 size-5" />
      )}
      <span
        className="
          absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/75
          to-black/40 px-2 py-1.5 backdrop-blur-[2px]
        "
      >
        <span
          className={cn(
            "group-hover:text-primary line-clamp-2 text-xs leading-snug font-medium",
            isRead ? "text-white/60" : "text-white",
          )}
        >
          {isNew && (
            <>
              <span
                className="bg-primary mr-1.5 mb-px inline-block size-1.5 rounded-full"
                aria-hidden
              />
              <span className="sr-only">New</span>
            </>
          )}
          <HighlightedTitle title={item.title} terms={highlightTerms} />
        </span>
        <HeadlineMeta
          item={item}
          now={now}
          withSource={withSource}
          isRead={isRead}
          className="text-white/65"
        />
      </span>
    </a>
  );

  return (
    <Tooltip content={<span className="block max-w-64">{item.title}</span>} side="bottom">
      {tile}
    </Tooltip>
  );
}
