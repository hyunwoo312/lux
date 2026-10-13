import { useEffect } from "react";

const IDLE_MS = 700;

export function useTransientScrollbar() {
  useEffect(() => {
    const timers = new Map<HTMLElement, number>();
    const onScroll = (event: Event) => {
      const node = event.target === document ? document.scrollingElement : event.target;
      if (!(node instanceof HTMLElement)) return;
      node.dataset.scrolling = "true";
      window.clearTimeout(timers.get(node));
      timers.set(
        node,
        window.setTimeout(() => {
          delete node.dataset.scrolling;
          timers.delete(node);
        }, IDLE_MS),
      );
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      for (const [node, timer] of timers) {
        window.clearTimeout(timer);
        delete node.dataset.scrolling;
      }
    };
  }, []);
}
