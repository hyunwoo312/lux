import type { Match } from "@/widgets/sports/types";

export type MatchSection = { id: string; label: string; matches: Match[] };

const BANDS: { id: string; label: string; state: Match["state"] }[] = [
  { id: "live", label: "Live", state: "in" },
  { id: "upcoming", label: "Upcoming", state: "pre" },
  { id: "past", label: "Past", state: "post" },
];

export function groupMatches(matches: Match[]): MatchSection[] {
  return BANDS.flatMap(({ id, label, state }) => {
    const band = matches.filter((match) => match.state === state);
    return band.length > 0 ? [{ id, label, matches: band }] : [];
  });
}
