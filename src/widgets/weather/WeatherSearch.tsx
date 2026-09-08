import { useMemo, useState } from "react";
import { Check, MapPin } from "lucide-react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { searchResults, useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useComboboxCursor } from "@/hooks/useComboboxCursor";
import { searchPlaces } from "@/widgets/weather/lib/open-meteo";
import {
  detailLocation,
  MAX_LOCATIONS,
  useWeather,
  useWeatherStore,
} from "@/widgets/weather/useWeatherStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { makeLocationId, type GeocodeResult } from "@/widgets/weather/types";
import { ListboxStatus } from "@/components/ListboxStatus";
import { OptionRow } from "@/components/OptionRow";
import { HeaderBackButton } from "@/widgets/core/HeaderBackButton";

const MIN_QUERY_LENGTH = 2;

export function WeatherSearch() {
  const instanceId = useWidgetInstanceId();
  const locations = useWeather((d) => d.locations);
  const selectedId = useWeather((d) => d.selectedId);
  const addLocation = useWeatherStore((s) => s.addLocation);
  const clearSelection = useWeatherStore((s) => s.clearSelection);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const detail = detailLocation(locations, selectedId);
  const inDetail = detail !== null && locations.length > 1;
  const expanded = !inDetail && (searchOpen || locations.length === 0);

  const atCap = locations.length >= MAX_LOCATIONS;
  const addedIds = useMemo(() => new Set(locations.map((entry) => entry.id)), [locations]);

  const state = useDebouncedSearch(query, searchPlaces, { minLength: MIN_QUERY_LENGTH });
  const results = searchResults(state);

  const isAdded = (result: GeocodeResult) =>
    addedIds.has(makeLocationId(result.latitude, result.longitude));

  const pick = (result: GeocodeResult) => {
    if (atCap || isAdded(result)) return;
    addLocation(instanceId, {
      id: makeLocationId(result.latitude, result.longitude),
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setQuery("");
  };

  const trimmed = query.trim();
  const showResults = expanded && trimmed.length >= MIN_QUERY_LENGTH;
  const hasOptions = showResults && !atCap && state.status !== "error" && results.length > 0;

  const { active, setActive, listboxId, optionId, onInputKeyDown } = useComboboxCursor(results, {
    enabled: hasOptions,
    onPick: pick,
    isDisabled: isAdded,
  });

  if (inDetail) {
    return <HeaderBackButton label="Cities" onClick={() => clearSelection(instanceId)} />;
  }

  return (
    <ExpandingSearch
      open={expanded}
      onOpenChange={setSearchOpen}
      value={query}
      onValueChange={setQuery}
      onInputKeyDown={onInputKeyDown}
      ariaLabel="Search for a location"
      placeholder="Search city or place"
      popupOpen={showResults}
      listboxId={hasOptions ? listboxId : undefined}
      activeDescendantId={hasOptions ? optionId(active) : undefined}
    >
      {atCap ? (
        <ListboxStatus>Remove a city to add another (max {MAX_LOCATIONS}).</ListboxStatus>
      ) : state.status === "error" ? (
        <ListboxStatus>Couldn’t search for places.</ListboxStatus>
      ) : state.status === "loading" && results.length === 0 ? (
        <ListboxStatus>Searching…</ListboxStatus>
      ) : results.length === 0 ? (
        <ListboxStatus>No matching places.</ListboxStatus>
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
              <li key={result.id} role="none">
                <OptionRow
                  id={optionId(index)}
                  active={index === active}
                  disabled={added}
                  onActivate={() => setActive(index)}
                  onPick={() => pick(result)}
                >
                  <MapPin className="text-ink-3 size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-body">{result.label}</span>
                  {added && <Check className="text-ink-3 size-4 shrink-0" aria-hidden />}
                </OptionRow>
              </li>
            );
          })}
        </ul>
      )}
    </ExpandingSearch>
  );
}
