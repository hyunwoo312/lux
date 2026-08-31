import { useEffect, useState } from "react";

export const SEARCH_DEBOUNCE_MS = 300;

const SPINNER_GRACE_MS = 150;

export type SearchState<T> =
  | { status: "idle" }
  | { status: "loading"; data: T[] }
  | { status: "error"; error: Error }
  | { status: "empty" }
  | { status: "success"; data: T[] };

const EMPTY: never[] = [];

export function searchResults<T>(state: SearchState<T>): T[] {
  return state.status === "loading" || state.status === "success" ? state.data : EMPTY;
}

type SearchOptions = {
  minLength?: number;
  delayMs?: number;
};

export function useDebouncedSearch<T>(
  query: string,
  search: (query: string, signal: AbortSignal) => Promise<T[]>,
  { minLength = 1, delayMs = SEARCH_DEBOUNCE_MS }: SearchOptions = {},
): SearchState<T> {
  const [state, setState] = useState<SearchState<T>>({ status: "idle" });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minLength) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    const spinner = window.setTimeout(() => {
      setState((previous) => ({ status: "loading", data: searchResults(previous) }));
    }, delayMs + SPINNER_GRACE_MS);
    const settle = (next: SearchState<T>) => {
      if (controller.signal.aborted) return;
      window.clearTimeout(spinner);
      setState(next);
    };
    const timer = window.setTimeout(() => {
      search(trimmed, controller.signal)
        .then((data) => {
          settle(data.length === 0 ? { status: "empty" } : { status: "success", data });
        })
        .catch((error: unknown) => {
          settle({
            status: "error",
            error: error instanceof Error ? error : new Error("Search failed."),
          });
        });
    }, delayMs);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(spinner);
    };
  }, [query, search, minLength, delayMs]);

  return state;
}
