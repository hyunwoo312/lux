import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PolledResourceState } from "@/widgets/core/usePolledResource";
import { hasThumbnails } from "@/widgets/news/lib/news";
import { HeadlineRow } from "@/widgets/news/components/HeadlineRow";
import { useNewsResource } from "@/widgets/news/hooks/useNewsResource";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { NewsItem } from "@/widgets/news/types";
import type { OpenBehavior } from "@/lib/open-url";

export function NewsWidget() {
  const { state, refresh, isRefreshing, source, query } = useNewsResource();
  const openBehavior = useNews((d) => d.openBehavior);
  const googleQuery = useNews((d) => d.googleQuery);
  const sortByLatest = useNews((d) => d.sortByLatest);

  return (
    <div className="flex h-full flex-col gap-2">
      {source === "google" && <GoogleSearch query={googleQuery} />}
      <div className="min-h-0 flex-1">
        <NewsContent
          state={state}
          refresh={refresh}
          isRefreshing={isRefreshing}
          openBehavior={openBehavior}
          withThumbnail={hasThumbnails(source)}
          sortByLatest={sortByLatest}
          searchQuery={query || undefined}
        />
      </div>
    </div>
  );
}

type NewsContentProps = {
  state: PolledResourceState<NewsItem[]>;
  refresh: () => void;
  isRefreshing: boolean;
  openBehavior: OpenBehavior;
  withThumbnail: boolean;
  sortByLatest: boolean;
  searchQuery: string | undefined;
};

function NewsContent({
  state,
  refresh,
  isRefreshing,
  openBehavior,
  withThumbnail,
  sortByLatest,
  searchQuery,
}: NewsContentProps) {
  if (state.status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
        <p className="text-muted-foreground text-sm">Couldn’t load the news.</p>
        <Button size="sm" variant="outline" onClick={refresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Retrying…
            </>
          ) : (
            "Retry"
          )}
        </Button>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-start gap-2.5">
            {withThumbnail && <Skeleton className="size-11 shrink-0 rounded-md" />}
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div
        className="
          text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm
        "
      >
        {searchQuery ? `No results for “${searchQuery}”` : "No headlines right now."}
      </div>
    );
  }

  const now = Date.now();
  const items = sortByLatest
    ? [...state.data].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
    : state.data;

  return (
    <ul className="flex h-full flex-col gap-0.5 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id}>
          <HeadlineRow
            item={item}
            now={now}
            openBehavior={openBehavior}
            withThumbnail={withThumbnail}
          />
        </li>
      ))}
    </ul>
  );
}

function GoogleSearch({ query }: { query: string }) {
  const instanceId = useWidgetInstanceId();
  const setGoogleQuery = useNewsStore((s) => s.setGoogleQuery);
  const [value, setValue] = useState(query);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setGoogleQuery(instanceId, value.trim());
  };

  const clear = () => {
    setValue("");
    setGoogleQuery(instanceId, "");
  };

  return (
    <form onSubmit={submit} className="relative shrink-0">
      <Search
        className="
          text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4
          -translate-y-1/2
        "
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search Google News…"
        aria-label="Search Google News"
        className="[&::-webkit-search-cancel-button]:hidden px-8"
      />
      {query && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="
            text-muted-foreground
            hover:text-foreground
            focus-visible:ring-ring/40
            absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center
            rounded-md outline-none
            focus-visible:ring-2
          "
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </form>
  );
}
