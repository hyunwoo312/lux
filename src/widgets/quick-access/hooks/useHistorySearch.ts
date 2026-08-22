import { useEffect, useState } from "react";
import { searchHistory } from "@/widgets/quick-access/browser";
import type { BrowserItem } from "@/widgets/quick-access/types";

const DEBOUNCE_MS = 200;
const LIMIT = 60;

export function useHistorySearch(query: string): BrowserItem[] | null {
  const [results, setResults] = useState<BrowserItem[] | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setResults(null);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void searchHistory(trimmed, LIMIT)
        .then((items) => {
          if (active) setResults(items);
        })
        .catch(() => {
          if (active) setResults([]);
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  return trimmed ? results : null;
}
