import { useEffect, useRef, useState } from "react";
import { searchDiscover } from "@/widgets/anilist/lib/api/discover";
import { loadFailureMessage } from "@/widgets/anilist/lib/load-failure";
import type { DiscoverMedia, DiscoverType, TitleLanguage } from "@/widgets/anilist/types";

export const SEARCH_DEBOUNCE_MS = 300;

export type DiscoverSearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; data: DiscoverMedia[] };

export function useDiscoverSearch(
  query: string,
  lang: TitleLanguage,
  type: DiscoverType,
  authed: boolean,
): DiscoverSearchState {
  const [state, setState] = useState<DiscoverSearchState>({ status: "idle" });
  const requestRef = useRef(0);

  useEffect(() => {
    requestRef.current += 1;
    const requestId = requestRef.current;
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchDiscover(lang, trimmed, type, authed, controller.signal)
        .then((results) => {
          if (requestRef.current !== requestId) return;
          setState(
            results.length === 0 ? { status: "empty" } : { status: "success", data: results },
          );
        })
        .catch((error: unknown) => {
          if (requestRef.current !== requestId) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          setState({
            status: "error",
            message:
              error instanceof Error
                ? loadFailureMessage(error, "search results")
                : "Couldn’t search AniList.",
          });
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, lang, type, authed]);

  return state;
}
