import { useCallback, useState } from "react";

export type ElementSize = { width: number; height: number };

export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  const ref = useCallback((element: T | null) => {
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
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
