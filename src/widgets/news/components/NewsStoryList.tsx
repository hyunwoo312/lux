import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { fade } from "@/lib/motion";
import { normalizeTitle } from "@/widgets/news/lib/news";
import { HeadlineRow } from "@/widgets/news/components/HeadlineRow";
import { HeadlineTile } from "@/widgets/news/components/HeadlineTile";
import { StoryPreview } from "@/widgets/news/components/StoryPreview";
import { TILE_GRID_CLASS } from "@/widgets/news/components/tileStyles";
import { useStoryNavigation } from "@/widgets/news/hooks/useStoryNavigation";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem, NewsLayout } from "@/widgets/news/types";

type Props = {
  items: NewsItem[];
  label?: string;
  emptyState?: ReactNode;
  notices?: ReactNode;
  now: number;
  openBehavior: OpenBehavior;
  withThumbnail: boolean;
  withSource: boolean;
  loadImages: boolean;
  layout: NewsLayout;
  readTitles: Set<string>;
  newTitles: Set<string>;
  highlightTerms: string[];
  savedLinks: Set<string>;
  onRead: (title: string) => void;
  onToggleRead: (title: string) => void;
  onToggleSaved: (item: NewsItem) => void;
};

export function NewsStoryList({
  items,
  label = "Headlines",
  emptyState,
  notices,
  now,
  openBehavior,
  withThumbnail,
  withSource,
  loadImages,
  layout,
  readTitles,
  newTitles,
  highlightTerms,
  savedLinks,
  onRead,
  onToggleRead,
  onToggleSaved,
}: Props) {
  const reduced = useReducedMotion();
  const navigation = useStoryNavigation({
    items,
    openBehavior,
    onRead: (item) => onRead(normalizeTitle(item.title)),
    onToggleRead: (item) => onToggleRead(normalizeTitle(item.title)),
    onToggleSaved,
  });
  const { selected, selection } = navigation;
  return (
    <div
      ref={navigation.root}
      onKeyDown={navigation.onKeyDown}
      tabIndex={-1}
      className="focus-ring relative h-full min-h-0 rounded-md"
    >
      <div className={cn("flex h-full min-h-0 flex-col", selected && "hidden")}>
        <div className="shrink-0">{notices}</div>
        {items.length === 0 ? (
          (emptyState ?? (
            <p
              role="status"
              className="
                text-ink-3 flex h-full items-center justify-center px-4 text-center text-body
              "
            >
              No unread headlines here. Switch off Unread to see everything.
            </p>
          ))
        ) : (
          <ul
            aria-label={label}
            className={cn(
              "scroll-fade min-h-0 flex-1 overflow-y-auto p-1.5",
              layout === "tiles" ? cn(TILE_GRID_CLASS, "content-start") : "flex flex-col gap-0.5",
            )}
          >
            {items.map((item) => {
              const key = normalizeTitle(item.title);
              const props = {
                item,
                now,
                openBehavior,
                isRead: readTitles.has(key),
                isNew: newTitles.has(key) && !readTitles.has(key),
                isSaved: savedLinks.has(item.link),
                highlightTerms,
                onRead: () => onRead(key),
                onToggleSaved: () => onToggleSaved(item),
                onPreview: () => navigation.onPreview(item),
              };
              return (
                <li key={item.link} className="min-w-0">
                  {layout === "tiles" ? (
                    <HeadlineTile {...props} />
                  ) : (
                    <HeadlineRow {...props} withThumbnail={withThumbnail} withSource={withSource} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <AnimatePresence initial={false}>
        {selected && selection && (
          <motion.div key="preview" {...fade(reduced, "fast")} className="absolute inset-0">
            <StoryPreview
              item={selected}
              now={now}
              openBehavior={openBehavior}
              loadImages={loadImages}
              highlightTerms={highlightTerms}
              isRead={readTitles.has(normalizeTitle(selected.title))}
              isSaved={savedLinks.has(selected.link)}
              position={selection.index}
              total={selection.queue.length}
              onBack={navigation.onBack}
              onMove={navigation.onMove}
              onRead={() => onRead(normalizeTitle(selected.title))}
              onToggleRead={() => onToggleRead(normalizeTitle(selected.title))}
              onToggleSaved={() => onToggleSaved(selected)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
