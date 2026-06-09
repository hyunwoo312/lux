import { motion } from "motion/react";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemActionButton } from "@/widgets/quick-access/components/ItemActionButton";
import { QuickItem } from "@/widgets/quick-access/components/QuickItem";
import {
  QA_GRID_CONTAINER,
  QA_LIST_CONTAINER,
  QA_REVEAL,
  qaTileClass,
} from "@/widgets/quick-access/lib/itemStyles";
import { keyOf } from "@/widgets/quick-access/lib/url";
import type { BrowserItem, QuickAccessView } from "@/widgets/quick-access/types";

type BrowserListProps = {
  items: BrowserItem[];
  view: QuickAccessView;
  animateLayout: boolean;
  pinnedUrls: Set<string>;
  onOpen: (url: string) => void;
  onTogglePin: (item: BrowserItem) => void;
};

function PinButton({
  item,
  view,
  pinned,
  onTogglePin,
}: {
  item: BrowserItem;
  view: QuickAccessView;
  pinned: boolean;
  onTogglePin: (item: BrowserItem) => void;
}) {
  return (
    <div
      className={cn(
        "absolute",
        view === "grid" ? "top-1 right-1" : "top-1/2 right-2 -translate-y-1/2",
        pinned ? "opacity-100 transition duration-200" : QA_REVEAL,
      )}
    >
      <ItemActionButton
        label={pinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
        onClick={() => onTogglePin(item)}
        className={cn("bg-card rounded-md p-1", pinned && "text-primary hover:text-primary")}
      >
        <Pin className={cn(pinned && "fill-current")} />
      </ItemActionButton>
    </div>
  );
}

export function BrowserList({
  items,
  view,
  animateLayout,
  pinnedUrls,
  onOpen,
  onTogglePin,
}: BrowserListProps) {
  return (
    <ul className={view === "grid" ? QA_GRID_CONTAINER : QA_LIST_CONTAINER}>
      {items.map((item) => {
        const pinned = pinnedUrls.has(keyOf(item.url));
        return (
          <motion.li key={item.id} layout={animateLayout} className="group relative">
            <button type="button" onClick={() => onOpen(item.url)} className={qaTileClass(view)}>
              <QuickItem
                url={item.url}
                title={item.title}
                view={view}
                trailingPad={view === "list" ? (pinned ? "pr-7" : "group-hover:pr-7") : undefined}
              />
            </button>
            <PinButton item={item} view={view} pinned={pinned} onTogglePin={onTogglePin} />
          </motion.li>
        );
      })}
    </ul>
  );
}
