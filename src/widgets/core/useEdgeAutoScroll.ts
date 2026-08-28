import { useCallback, useEffect, useRef } from "react";

const EDGE_ZONE = 60;
const EDGE_MAX_SPEED = 18;

export function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return el;
    el = el.parentElement;
  }
  return null;
}

export type EdgeAutoScroll = {
  begin: (container: HTMLElement | null) => void;
  track: (y: number) => void;
  end: () => void;
};

export function useEdgeAutoScroll(): EdgeAutoScroll {
  const active = useRef(false);
  const pointerY = useRef<number | null>(null);
  const scroller = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);

  const step = useCallback(() => {
    if (!active.current) {
      frame.current = null;
      return;
    }
    const y = pointerY.current;
    const target = scroller.current;
    if (y !== null && target) {
      const rect = target.getBoundingClientRect();
      const fromBottom = rect.bottom - y;
      const fromTop = y - rect.top;
      if (fromBottom < EDGE_ZONE) {
        const intensity = Math.min(1, (EDGE_ZONE - fromBottom) / EDGE_ZONE);
        target.scrollBy({ top: EDGE_MAX_SPEED * intensity * intensity });
      } else if (fromTop < EDGE_ZONE && target.scrollTop > 0) {
        const intensity = Math.min(1, (EDGE_ZONE - fromTop) / EDGE_ZONE);
        target.scrollBy({ top: -EDGE_MAX_SPEED * intensity * intensity });
      }
    }
    frame.current = requestAnimationFrame(step);
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return {
    begin: (container) => {
      active.current = true;
      pointerY.current = null;
      scroller.current = getScrollParent(container);
      if (frame.current === null) frame.current = requestAnimationFrame(step);
    },
    track: (y) => {
      pointerY.current = y;
    },
    end: () => {
      active.current = false;
      pointerY.current = null;
      scroller.current = null;
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    },
  };
}
