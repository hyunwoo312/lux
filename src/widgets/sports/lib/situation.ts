import type { MatchSituation } from "@/widgets/sports/types";

const BASE_LABELS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

function basesLabel(bases: number[]): string | null {
  if (bases.length === 0) return null;
  if (bases.length === 3) return "bases loaded";
  const named = bases.map((base) => BASE_LABELS[base] ?? `${base}`);
  return `runner${bases.length > 1 ? "s" : ""} on ${named.join(" & ")}`;
}

export function formatSituation(situation: MatchSituation | undefined): string | null {
  if (!situation) return null;

  const parts: string[] = [];
  if (situation.balls != null && situation.strikes != null) {
    parts.push(`${situation.balls}-${situation.strikes}`);
  }
  if (situation.outs != null) {
    parts.push(`${situation.outs} out`);
  }
  const bases = basesLabel(situation.bases);
  if (bases) parts.push(bases);

  return parts.length > 0 ? parts.join(", ") : null;
}
