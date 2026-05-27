import { useEffect, useState } from "react";
import { searchHistory } from "@/widgets/quick-access/browser";
import type { BrowserItem } from "@/widgets/quick-access/types";

const DEBOUNCE_MS = 180;
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
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [query, enabled]);

  return items;
}
