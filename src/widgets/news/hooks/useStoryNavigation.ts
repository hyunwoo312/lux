import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { openUrl, type OpenBehavior } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

type Props = {
  items: NewsItem[];
  openBehavior: OpenBehavior;
  onRead: (item: NewsItem) => void;
  onToggleRead: (item: NewsItem) => void;
  onToggleSaved: (item: NewsItem) => void;
};

export function useStoryNavigation({
  items,
  openBehavior,
  onRead,
  onToggleRead,
  onToggleSaved,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const origin = useRef<string | null>(null);
  const returning = useRef(false);
  const wasPreviewOpen = useRef(false);
  const [selection, setSelection] = useState<{ queue: NewsItem[]; index: number } | null>(null);
  const snapshot = selection?.queue[selection.index];
  const selected = snapshot
    ? (items.find((item) => item.link === snapshot.link) ?? snapshot)
    : null;
  const onPreview = (item: NewsItem) => {
    origin.current = item.link;
    setSelection({
      queue: items,
      index: Math.max(
        0,
        items.findIndex((entry) => entry.link === item.link),
      ),
    });
  };
  const onBack = () => {
    returning.current = true;
    setSelection(null);
  };
  const onMove = (step: number) =>
    setSelection((current) =>
      current
        ? {
            ...current,
            index: Math.max(0, Math.min(current.queue.length - 1, current.index + step)),
          }
        : null,
    );

  const isPreviewOpen = selected !== null;
  useLayoutEffect(() => {
    if (isPreviewOpen && !wasPreviewOpen.current) {
      root.current
        ?.querySelector<HTMLElement>("[data-preview-back]")
        ?.focus({ preventScroll: true });
    } else if (returning.current) {
      returning.current = false;
      const links = [...(root.current?.querySelectorAll<HTMLElement>("[data-news-link]") ?? [])];
      const target = links.find((link) => link.getAttribute("href") === origin.current) ?? links[0];
      (target ?? root.current)?.focus({ preventScroll: true });
    }
    wasPreviewOpen.current = isPreviewOpen;
  }, [isPreviewOpen, items]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (
      !(event.target instanceof HTMLElement) ||
      event.target.closest("input,textarea,select,[contenteditable=true]")
    )
      return;
    if (selected && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onBack();
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>("[data-news-link]");
    const item = selected ?? items.find((entry) => entry.link === link?.getAttribute("href"));
    if (!item) return;
    const key = event.key.toLowerCase();
    if (!selected && key === "m") {
      origin.current = item.link;
      returning.current = true;
    }
    if (["s", "m", "v"].includes(key)) {
      event.preventDefault();
      event.stopPropagation();
      if (key === "s") onToggleSaved(item);
      else if (key === "m") onToggleRead(item);
      else {
        onRead(item);
        openUrl(item.link, openBehavior);
      }
      return;
    }
    const step =
      key === "j" || (!selected && event.key === "ArrowDown")
        ? 1
        : key === "k" || (!selected && event.key === "ArrowUp")
          ? -1
          : 0;
    if (selected) {
      if (step) {
        event.preventDefault();
        onMove(step);
      }
      return;
    }
    const links = [
      ...(root.current?.querySelectorAll<HTMLAnchorElement>("[data-news-link]") ?? []),
    ];
    const index = links.indexOf(link!);
    const jump = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : null;
    if (!step && jump === null) return;
    event.preventDefault();
    const target = links[Math.max(0, Math.min(links.length - 1, jump ?? index + step))];
    target?.focus({ preventScroll: true });
    const list = target?.closest("ul");
    if (target && list) {
      const row = target.closest("li")?.getBoundingClientRect();
      const box = list.getBoundingClientRect();
      if (row && row.top < box.top) list.scrollTop += row.top - box.top;
      else if (row && row.bottom > box.bottom) list.scrollTop += row.bottom - box.bottom;
    }
  };
  return { root, selected, selection, onPreview, onBack, onMove, onKeyDown };
}
