import { useLayoutEffect, useRef, type FocusEvent } from "react";

type Place = { scroll: number; focus?: string };
type Props = { folderId: string; query: string; active: boolean };

function identity(target: HTMLElement): string | undefined {
  return target.dataset.bookmarkTarget ?? target.getAttribute("href") ?? undefined;
}

export function useBookmarkNavigation({ folderId, query, active }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const memory = useRef(new Map<string, Place>());
  const pending = useRef<string | true | null>(null);
  const previousFolder = useRef(folderId);
  const key = `${folderId}:${query.trim().toLowerCase()}`;
  const store = (place: Place) => {
    memory.current.delete(key);
    memory.current.set(key, place);
    if (memory.current.size > 40) {
      const oldest = memory.current.keys().next().value;
      if (oldest !== undefined) memory.current.delete(oldest);
    }
  };
  const remember = () => {
    store({
      ...memory.current.get(key),
      scroll: scrollRef.current?.scrollTop ?? 0,
    });
  };
  const prepare = (focus: string | true = true) => {
    remember();
    pending.current = focus;
  };
  const onFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLElement)) return;
    const target = event.target.closest<HTMLElement>("[data-bookmark-target],a[href]");
    if (!target) return;
    store({ scroll: scrollRef.current?.scrollTop ?? 0, focus: identity(target) });
  };

  useLayoutEffect(() => {
    if (!active) return;
    const place = memory.current.get(key);
    if (scrollRef.current) scrollRef.current.scrollTop = place?.scroll ?? 0;
    const folderChanged = previousFolder.current !== "" && previousFolder.current !== folderId;
    previousFolder.current = folderId;
    if (!pending.current && !folderChanged) return;
    const targets = [
      ...(scrollRef.current?.querySelectorAll<HTMLElement>("[data-bookmark-target],a[href]") ?? []),
    ];
    const preferred = typeof pending.current === "string" ? pending.current : place?.focus;
    const target =
      targets.find((entry) => identity(entry) === preferred) ?? targets[0] ?? rootRef.current;
    pending.current = null;
    target?.focus({ preventScroll: true });
  }, [key, folderId, active]);

  return { rootRef, scrollRef, remember, prepare, onFocusCapture, scopeKey: key };
}
