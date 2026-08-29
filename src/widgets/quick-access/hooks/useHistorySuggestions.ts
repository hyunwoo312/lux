import { useEffect, useState } from "react";
import { searchHistory } from "@/widgets/quick-access/browser";
import { LOCAL_SEARCH_DEBOUNCE_MS, type BrowserItem } from "@/widgets/quick-access/types";

const MIN_QUERY = 2;

export function useHistorySuggestions(query: string, enabled: boolean): BrowserItem[] {
  const [items, setItems] = useState<BrowserItem[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < MIN_QUERY) {
      setItems([]);
      return;
    }
    let active = true;
    const handle = window.setTimeout(() => {
      void searchHistory(trimmed)
        .then((results) => {
          if (active) setItems(results);
        })
        .catch(() => {
          if (active) setItems([]);
        });
    }, LOCAL_SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [query, enabled]);

  return items;
}
