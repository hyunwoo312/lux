import { useLayoutEffect, useRef, useState } from "react";

export function useIsClamped<T extends HTMLElement>(dependency: string) {
  const ref = useRef<T>(null);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [dependency]);

  return [ref, clamped] as const;
}
