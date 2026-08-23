import { useCallback, useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";
import { motion } from "motion/react";
import { Pin, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { ItemActionButton } from "@/components/ItemActionButton";
import { QuickItem } from "@/widgets/quick-access/components/QuickItem";
import { QuickLinkAnchor } from "@/widgets/quick-access/components/QuickLinkAnchor";
import {
  QA_GRID_CONTAINER,
  QA_LIST_CONTAINER,
  QA_REVEAL,
  qaTileClass,
} from "@/widgets/quick-access/lib/itemStyles";
import { keyOf } from "@/widgets/quick-access/lib/url";
import type { BrowserItem, OpenBehavior, QuickAccessView } from "@/widgets/quick-access/types";

type BrowserListProps = {
  items: BrowserItem[];
  view: QuickAccessView;
  animateLayout: boolean;
  pinnedUrls: Set<string>;
  scrollRef: RefObject<HTMLElement | null>;
  openBehavior: OpenBehavior;
  onOpen: (item: BrowserItem, event: MouseEvent<HTMLAnchorElement>) => void;
  onTogglePin: (item: BrowserItem) => void;
  onCloseTab?: (item: BrowserItem) => void;
  onToggleMuted?: (item: BrowserItem) => void;
};

const PAGE_SIZE = 30;

function RowActions({
  item,
  view,
  pinned,
  onTogglePin,
  onCloseTab,
  onToggleMuted,
}: {
  item: BrowserItem;
  view: QuickAccessView;
  pinned: boolean;
  onTogglePin: (item: BrowserItem) => void;
  onCloseTab?: (item: BrowserItem) => void;
  onToggleMuted?: (item: BrowserItem) => void;
}) {
  const isTab = item.tabId !== undefined;
  const canMute = isTab && (item.audible === true || item.muted === true);

  return (
    <div
      className={cn(
        "absolute flex items-center gap-1",
        view === "grid" ? "top-1 right-1" : "top-1/2 right-2 -translate-y-1/2",
        pinned || canMute ? "opacity-100 transition duration-200" : QA_REVEAL,
      )}
    >
      {canMute && onToggleMuted && (
        <ItemActionButton
          label={item.muted ? `Unmute ${item.title}` : `Mute ${item.title}`}
          onClick={() => onToggleMuted(item)}
          className={item.muted ? "text-ink-4" : "text-primary hover:text-primary"}
        >
          {item.muted ? <VolumeX /> : <Volume2 />}
        </ItemActionButton>
      )}
      {isTab && onCloseTab ? (
        <ItemActionButton
          label={`Close ${item.title}`}
          onClick={() => onCloseTab(item)}
          className="hover:text-destructive"
        >
          <X />
        </ItemActionButton>
      ) : (
        <ItemActionButton
          label={pinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
          onClick={() => onTogglePin(item)}
          className={cn(pinned && "text-primary hover:text-primary")}
        >
          <Pin className={cn(pinned && "fill-current")} />
        </ItemActionButton>
      )}
    </div>
  );
}

export function BrowserList({
  items,
  view,
  animateLayout,
  pinnedUrls,
  scrollRef,
  openBehavior,
  onOpen,
  onTogglePin,
  onCloseTab,
  onToggleMuted,
}: BrowserListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLLIElement>(null);

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visible.length < items.length;
  const loadMore = useCallback(() => setVisibleCount((count) => count + PAGE_SIZE), []);
  useInfiniteScroll(scrollRef, sentinelRef, hasMore, loadMore);

  return (
    <ul className={view === "grid" ? QA_GRID_CONTAINER : QA_LIST_CONTAINER}>
      {visible.map((item) => {
        const pinned = pinnedUrls.has(keyOf(item.url));
        return (
          <motion.li key={item.id} layout={animateLayout} className="group relative">
            <QuickLinkAnchor
              url={item.url}
              title={item.title}
              openBehavior={openBehavior}
              onClick={(event) => onOpen(item, event)}
              className={qaTileClass(view)}
            >
              <QuickItem
                url={item.url}
                title={item.title}
                view={view}
                trailingPad={view === "list" ? (pinned ? "pr-7" : "group-hover:pr-7") : undefined}
              />
            </QuickLinkAnchor>
            <RowActions
              item={item}
              view={view}
              pinned={pinned}
              onTogglePin={onTogglePin}
              onCloseTab={onCloseTab}
              onToggleMuted={onToggleMuted}
            />
          </motion.li>
        );
      })}
      {hasMore && <li ref={sentinelRef} aria-hidden className="h-px" />}
    </ul>
  );
}
