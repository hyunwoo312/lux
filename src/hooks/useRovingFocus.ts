import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

type Orientation = "horizontal" | "vertical";

export type RovingItemProps = {
  ref?: (node: HTMLButtonElement | null) => void;
  tabIndex?: 0 | -1;
  onFocus?: () => void;
};

type RovingFocusOptions = {
  count: number;
  orientation?: Orientation;
  activeIndex?: number;
  onActivate?: (index: number) => void;
};

type RovingFocus = {
  containerProps: {
    onKeyDown: (event: ReactKeyboardEvent) => void;
    "aria-orientation": Orientation;
  };
  itemProps: (index: number) => RovingItemProps;
};

const KEYS: Record<Orientation, { back: string; forward: string }> = {
  horizontal: { back: "ArrowLeft", forward: "ArrowRight" },
  vertical: { back: "ArrowUp", forward: "ArrowDown" },
};

export function useRovingFocus({
  count,
  orientation = "horizontal",
  activeIndex,
  onActivate,
}: RovingFocusOptions): RovingFocus {
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState(0);

  const current = count === 0 ? -1 : Math.min(Math.max(activeIndex ?? focused, 0), count - 1);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    const { back, forward } = KEYS[orientation];
    const step = event.key === forward ? 1 : event.key === back ? -1 : 0;
    const jump = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (count === 0 || (step === 0 && jump === null)) return;

    event.preventDefault();
    const next = jump ?? (current + step + count) % count;
    if (activeIndex === undefined) setFocused(next);
    onActivate?.(next);
    items.current[next]?.focus();
  };

  return {
    containerProps: { onKeyDown, "aria-orientation": orientation },
    itemProps: (index) => ({
      ref: (node) => {
        items.current[index] = node;
      },
      tabIndex: index === current ? 0 : -1,
      onFocus: () => {
        if (activeIndex === undefined) setFocused(index);
      },
    }),
  };
}
