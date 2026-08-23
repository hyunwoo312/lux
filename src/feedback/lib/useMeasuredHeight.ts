import { useCallback, useEffect, useRef, useState } from "react";

export function useMeasuredHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    if (typeof ResizeObserver === "undefined") {
      setHeight(node.getBoundingClientRect().height);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setHeight(entry.contentRect.height);
    });
    observer.observe(node);
    observerRef.current = observer;
    setHeight(node.getBoundingClientRect().height);
  }, []);

  return [ref, height] as const;
}
