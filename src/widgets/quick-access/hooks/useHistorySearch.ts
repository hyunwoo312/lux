import { useDebouncedSearch, type SearchState } from "@/hooks/useDebouncedSearch";
import { searchHistory } from "@/lib/browser";
import { LOCAL_SEARCH_DEBOUNCE_MS, type BrowserItem } from "@/widgets/quick-access/types";

const LIMIT = 60;

const search = (query: string) => searchHistory(query, LIMIT);

export function useHistorySearch(query: string): SearchState<BrowserItem> {
  return useDebouncedSearch(query, search, { delayMs: LOCAL_SEARCH_DEBOUNCE_MS });
}
