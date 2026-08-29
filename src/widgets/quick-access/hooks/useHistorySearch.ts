import { useEffect, useState } from "react";
import { searchHistory } from "@/widgets/quick-access/browser";
import { LOCAL_SEARCH_DEBOUNCE_MS, type BrowserItem } from "@/widgets/quick-access/types";

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
    }, LOCAL_SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  return trimmed ? results : null;
}
