import { useEffect } from "react";

const NATIVE_MENU_SELECTOR =
  'a[href], img, input, textarea, [contenteditable]:not([contenteditable="false"])';

export function useDisableContextMenu() {
  useEffect(() => {
    const block = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(NATIVE_MENU_SELECTOR)) return;
      if (!document.getSelection()?.isCollapsed) return;
      event.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);
}
