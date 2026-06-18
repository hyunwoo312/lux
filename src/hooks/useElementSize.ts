import { useCallback, useRef, useState } from "react";

export type ElementSize = { width: number; height: number };

export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((element: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize((previous) =>
        previous.width === rect.width && previous.height === rect.height
          ? previous
          : { width: rect.width, height: rect.height },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observerRef.current = observer;
  }, []);

  return [ref, size] as const;
}
