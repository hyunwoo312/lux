import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

type CursorOptions<T> = {
  enabled: boolean;
  onPick: (item: T) => void;
  isDisabled?: (item: T) => boolean;
  itemKey?: (item: T) => string;
  startInactive?: boolean;
};

type ComboboxCursor = {
  active: number;
  setActive: (index: number) => void;
  listboxId: string;
  optionId: (index: number) => string;
  onInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
};

export function useComboboxCursor<T>(
  items: T[],
  { enabled, onPick, isDisabled, itemKey, startInactive = false }: CursorOptions<T>,
): ComboboxCursor {
  const baseId = useId();
  const [active, setActive] = useState(startInactive ? -1 : 0);
  const disabledRef = useRef(isDisabled);
  const keyRef = useRef(itemKey);
  const chosen = useRef<string | null>(null);

  useEffect(() => {
    disabledRef.current = isDisabled;
    keyRef.current = itemKey;
  });

  useEffect(() => {
    const disabled = disabledRef.current;
    const keyOf = keyRef.current;
    const kept =
      chosen.current !== null && keyOf
        ? items.findIndex((item) => keyOf(item) === chosen.current)
        : -1;
    if (kept >= 0) {
      setActive(kept);
      return;
    }
    chosen.current = null;
    setActive(
      startInactive
        ? -1
        : Math.max(
            0,
            items.findIndex((item) => !disabled?.(item)),
          ),
    );
  }, [items, startInactive]);

  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const choose = (index: number) => {
    setActive(index);
    const item = items[index];
    chosen.current = item !== undefined && itemKey ? itemKey(item) : null;
  };

  const moveActive = (index: number) => {
    choose(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
  };

  const step = (direction: 1 | -1) => {
    let index = active < 0 && direction < 0 ? 0 : active;
    for (let taken = 0; taken < items.length; taken += 1) {
      index = (index + direction + items.length) % items.length;
      const item = items[index];
      if (item !== undefined && !isDisabled?.(item)) {
        moveActive(index);
        return;
      }
    }
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!enabled) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        step(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        step(-1);
        return;
      case "Enter": {
        const item = items[active];
        if (item === undefined || isDisabled?.(item)) return;
        event.preventDefault();
        onPick(item);
        return;
      }
    }
  };

  return { active, setActive: choose, listboxId: `${baseId}-listbox`, optionId, onInputKeyDown };
}
