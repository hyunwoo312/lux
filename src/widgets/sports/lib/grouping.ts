import type { MatchState } from "@/widgets/sports/types";

export type MatchSection<T> = { id: string; label: string; matches: T[] };

const BANDS: { id: string; label: string; state: MatchState }[] = [
  { id: "live", label: "Live", state: "in" },
  { id: "upcoming", label: "Upcoming", state: "pre" },
  { id: "past", label: "Past", state: "post" },
];

export function groupMatches<T extends { state: MatchState }>(matches: T[]): MatchSection<T>[] {
  return BANDS.flatMap(({ id, label, state }) => {
    const band = matches.filter((match) => match.state === state);
    return band.length > 0 ? [{ id, label, matches: band }] : [];
  });
}
