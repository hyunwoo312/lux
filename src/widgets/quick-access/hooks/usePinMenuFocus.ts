import { useRef, type KeyboardEvent } from "react";

export function usePinMenuFocus(close: () => void) {
  const content = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const editing = useRef(false);
  const tabDirection = useRef<1 | -1 | null>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Tab") {
      event.preventDefault();
      tabDirection.current = event.shiftKey ? -1 : 1;
      close();
      return;
    }
    const items = [
      ...(content.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []),
    ];
    const index = items.findIndex((item) => item === document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const target =
      event.key === "Home"
        ? items[0]
        : event.key === "End"
          ? items.at(-1)
          : step
            ? items[(index + step + items.length) % items.length]
            : event.key.length === 1
              ? items.find((item) =>
                  item.textContent?.trimStart().toLowerCase().startsWith(event.key.toLowerCase()),
                )
              : null;
    if (!target) return;
    event.preventDefault();
    target.focus();
  };
  const onCloseAutoFocus = (event: Event) => {
    if (editing.current) {
      event.preventDefault();
      editing.current = false;
      return;
    }
    if (tabDirection.current === null) return;
    event.preventDefault();
    const candidates = [
      ...document.querySelectorAll<HTMLElement>("a[href],button,input,select,textarea,[tabindex]"),
    ].filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(":disabled") &&
        !element.closest('[inert],[role="menu"]') &&
        element.getClientRects().length > 0,
    );
    const index = candidates.findIndex((element) => element === trigger.current);
    const next = candidates[index + tabDirection.current];
    tabDirection.current = null;
    (next ?? trigger.current)?.focus({ preventScroll: true });
  };
  return { content, trigger, editing, onKeyDown, onCloseAutoFocus };
}
