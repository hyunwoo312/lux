import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

type CursorOptions<T> = {
  enabled: boolean;
  onPick: (item: T) => void;
  isDisabled?: (item: T) => boolean;
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
  { enabled, onPick, isDisabled }: CursorOptions<T>,
): ComboboxCursor {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const disabledRef = useRef(isDisabled);

  useEffect(() => {
    disabledRef.current = isDisabled;
  });

  useEffect(() => {
    const disabled = disabledRef.current;
    setActive(
      Math.max(
        0,
        items.findIndex((item) => !disabled?.(item)),
      ),
    );
  }, [items]);

  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const moveActive = (index: number) => {
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
  };

  const step = (direction: 1 | -1) => {
    let index = active;
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
        event.preventDefault();
        const item = items[active];
        if (item !== undefined && !isDisabled?.(item)) onPick(item);
        return;
      }
    }
  };

  return { active, setActive, listboxId: `${baseId}-listbox`, optionId, onInputKeyDown };
}
