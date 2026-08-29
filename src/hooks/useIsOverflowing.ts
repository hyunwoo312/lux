import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type OverflowAxis = "horizontal" | "vertical";

const SUBPIXEL_TOLERANCE_PX = 1;

export function useIsOverflowing<T extends HTMLElement>(axis: OverflowAxis, content: string) {
  const [overflowing, setOverflowing] = useState(false);
  const elementRef = useRef<T | null>(null);

  const measure = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    setOverflowing(
      axis === "horizontal"
        ? element.scrollWidth > element.clientWidth + SUBPIXEL_TOLERANCE_PX
        : element.scrollHeight > element.clientHeight + SUBPIXEL_TOLERANCE_PX,
    );
  }, [axis]);

  const ref = useCallback(
    (element: T | null) => {
      elementRef.current = element;
      if (!element) return;
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => {
        observer.disconnect();
        elementRef.current = null;
      };
    },
    [measure],
  );

  useLayoutEffect(() => {
    measure();
  }, [measure, content]);

  return [ref, overflowing] as const;
}
