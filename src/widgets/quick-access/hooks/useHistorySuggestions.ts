import { searchResults, useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { searchHistory } from "@/lib/browser";
import { LOCAL_SEARCH_DEBOUNCE_MS, type BrowserItem } from "@/widgets/quick-access/types";

const MIN_QUERY = 2;

const search = (query: string) => searchHistory(query);

export function useHistorySuggestions(query: string, enabled: boolean): BrowserItem[] {
  return searchResults(
    useDebouncedSearch(enabled ? query : "", search, {
      minLength: MIN_QUERY,
      delayMs: LOCAL_SEARCH_DEBOUNCE_MS,
    }),
  );
}
