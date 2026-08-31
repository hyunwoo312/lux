import { useEffect, useRef } from "react";

const IDLE_MS = 700;

export function useTransientScrollbar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const idle = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(idle.current), []);

  const onScroll = () => {
    const node = ref.current;
    if (!node) return;
    node.dataset.scrolling = "true";
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => {
      node.dataset.scrolling = "false";
    }, IDLE_MS);
  };

  return { ref, onScroll };
}
