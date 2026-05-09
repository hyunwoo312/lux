import { motion } from "motion/react";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemActionButton } from "@/widgets/quick-access/components/ItemActionButton";
import { LinkIcon } from "@/widgets/quick-access/components/LinkIcon";
import { normalizeUrl } from "@/widgets/quick-access/lib/url";
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
        "absolute transition duration-200",
        view === "grid" ? "top-1 right-1" : "top-1/2 right-2 -translate-y-1/2",
        pinned
          ? "opacity-100"
          : `
            scale-90 opacity-0
            group-focus-within:scale-100 group-focus-within:opacity-100
            group-hover:scale-100 group-hover:opacity-100
          `,
      )}
    >
      <ItemActionButton
        label={pinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
        onClick={() => onTogglePin(item)}
        className={cn(
          "bg-card/80 rounded-md p-1 backdrop-blur-sm",
          pinned && "text-primary hover:text-primary",
        )}
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
    <ul
      className={cn(
        view === "grid"
          ? "grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1"
          : "flex flex-col gap-0.5",
      )}
    >
      {items.map((item) => {
        const pinned = pinnedUrls.has(normalizeUrl(item.url) ?? item.url);
        return view === "grid" ? (
          <motion.li key={item.id} layout={animateLayout} className="group relative">
            <button
              type="button"
              onClick={() => onOpen(item.url)}
              className="
                hover:bg-foreground/5
                flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg p-2
                transition-colors
              "
            >
              <LinkIcon url={item.url} view={view} />
              <span className="w-full truncate text-center text-xs">{item.title}</span>
            </button>
            <PinButton item={item} view={view} pinned={pinned} onTogglePin={onTogglePin} />
          </motion.li>
        ) : (
          <motion.li key={item.id} layout={animateLayout} className="group relative">
            <button
              type="button"
              onClick={() => onOpen(item.url)}
              className="
                hover:bg-foreground/5
                flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left
                transition-colors
              "
            >
              <LinkIcon url={item.url} view={view} />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm transition-[padding] duration-200",
                  pinned ? "pr-7" : "group-hover:pr-7",
                )}
              >
                {item.title}
              </span>
            </button>
            <PinButton item={item} view={view} pinned={pinned} onTogglePin={onTogglePin} />
          </motion.li>
        );
      })}
    </ul>
  );
}
