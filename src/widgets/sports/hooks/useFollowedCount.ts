import { useSports } from "@/widgets/sports/useSportsStore";

export function useFollowedCount(): number {
  return useSports((d) =>
    Object.values(d.following).reduce(
      (total, entry) => total + entry.teams.length + (entry.tour ? 1 : 0),
      0,
    ),
  );
}
