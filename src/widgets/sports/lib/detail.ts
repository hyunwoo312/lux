import type { Match } from "@/widgets/sports/types";

export type DetailPerson = {
  logo?: string;
  label?: string;
  name: string;
  detail?: string;
};

export function peopleFor(match: Match): DetailPerson[] {
  const sides = [match.away, match.home];
  if (match.state === "pre") {
    return sides
      .filter((team) => team.probable)
      .map((team) => ({ logo: team.logo, name: team.probable ?? "" }));
  }
  return sides.flatMap((team) =>
    team.leaders.map((leader) => ({
      logo: team.logo,
      label: leader.label,
      name: leader.athlete,
      detail: leader.detail,
    })),
  );
}
