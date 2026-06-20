import { useEffect } from "react";

const EDITABLE_SELECTOR = 'input, textarea, [contenteditable]:not([contenteditable="false"])';

export function useDisableContextMenu() {
  useEffect(() => {
    const block = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(EDITABLE_SELECTOR)) return;
      event.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);
}
