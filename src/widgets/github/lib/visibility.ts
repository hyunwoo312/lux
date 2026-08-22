export function visibleItems<T extends { isPrivate: boolean }>(
  items: T[],
  showPrivate: boolean,
): T[] {
  return showPrivate ? items : items.filter((item) => !item.isPrivate);
}
