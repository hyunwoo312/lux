export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function isModalLayerOpen(): boolean {
  return document.body.style.pointerEvents === "none";
}

export function isSearchWithText(element: Element | null): boolean {
  return element instanceof HTMLInputElement && element.type === "search" && element.value !== "";
}
