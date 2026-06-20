import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronLeft, MapPin } from "lucide-react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { cn } from "@/lib/utils";
import { getAccentVars } from "@/widgets/core/accent";
import { searchPlaces } from "@/widgets/weather/lib/open-meteo";
import { MAX_LOCATIONS, useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { makeLocationId, WEATHER_ACCENT, type GeocodeResult } from "@/widgets/weather/types";

export function WeatherSearch() {
  const baseId = useId();
  const locations = useWeatherStore((s) => s.locations);
  const selectedId = useWeatherStore((s) => s.selectedId);
  const addLocation = useWeatherStore((s) => s.addLocation);
  const clearSelection = useWeatherStore((s) => s.clearSelection);
  const searchOpen = useWeatherStore((s) => s.searchOpen);
  const openSearch = useWeatherStore((s) => s.openSearch);
  const closeSearch = useWeatherStore((s) => s.closeSearch);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);

  const inDetail = locations.length > 1 && selectedId !== null;
  const expanded = !inDetail && (searchOpen || locations.length === 0);

  const atCap = locations.length >= MAX_LOCATIONS;
  const addedIds = useMemo(() => new Set(locations.map((entry) => entry.id)), [locations]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    window.clearTimeout(debounceRef.current);
    setSearching(true);
    setError(null);
    debounceRef.current = window.setTimeout(() => {
      searchPlaces(trimmed, controller.signal)
        .then((found) => {
          setResults(found);
          setActive(0);
          setSearching(false);
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setError("Couldn't search for places.");
          setSearching(false);
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const isAdded = (result: GeocodeResult) =>
    addedIds.has(makeLocationId(result.latitude, result.longitude));

  const pick = (result: GeocodeResult) => {
    if (atCap || isAdded(result)) return;
    addLocation({
      id: makeLocationId(result.latitude, result.longitude),
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setQuery("");
    setResults([]);
  };

  const trimmed = query.trim();
  const showResults = expanded && trimmed.length >= 2;
  const hasOptions = showResults && !atCap && !error && results.length > 0;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const moveActive = (index: number) => {
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!hasOptions) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive((active + 1) % results.length);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveActive((active - 1 + results.length) % results.length);
        return;
      case "Enter": {
        event.preventDefault();
        const result = results[active];
        if (result) pick(result);
        return;
      }
    }
  };

  if (inDetail) {
    return (
      <button
        type="button"
        onClick={clearSelection}
        className="
          text-muted-foreground
          hover:text-foreground
          inline-flex items-center gap-0.5 text-xs font-medium tracking-wide uppercase
          transition-colors
        "
      >
        <ChevronLeft className="size-4" aria-hidden />
        Cities
      </button>
    );
  }

  return (
    <ExpandingSearch
      open={expanded}
      onOpenChange={(next) => (next ? openSearch() : closeSearch())}
      value={query}
      onValueChange={setQuery}
      onInputKeyDown={onInputKeyDown}
      ariaLabel="Search for a location"
      placeholder="Search city or place"
      popupOpen={showResults}
      listboxId={hasOptions ? listboxId : undefined}
      activeDescendantId={hasOptions ? optionId(active) : undefined}
    >
      <div
        style={getAccentVars(WEATHER_ACCENT)}
        className="border-input bg-popover w-full overflow-hidden rounded-sm border shadow-md"
      >
        <div className="max-h-56 overflow-y-auto p-1">
          {atCap ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">
              Remove a city to add another (max {MAX_LOCATIONS}).
            </p>
          ) : error ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">{error}</p>
          ) : searching && results.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">No matching places.</p>
          ) : (
            <ul
              role="listbox"
              id={listboxId}
              aria-label="Search results"
              className="flex flex-col gap-0.5"
            >
              {results.map((result, index) => {
                const added = isAdded(result);
                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === active && !added}
                      disabled={added}
                      onMouseMove={() => setActive(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(result)}
                      className={cn(
                        `
                          flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm
                          transition-colors
                        `,
                        index === active && !added
                          ? "bg-accent text-primary"
                          : "hover:bg-accent/60 hover:text-primary",
                        added && "opacity-60",
                      )}
                    >
                      <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{result.label}</span>
                      {added && (
                        <Check className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ExpandingSearch>
  );
}
