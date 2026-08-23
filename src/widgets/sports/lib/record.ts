import type { Sport } from "@/widgets/sports/lib/leagues";

const LABELS: Record<Sport, Record<number, string[] | undefined>> = {
  soccer: { 2: ["W", "L"], 3: ["W", "D", "L"] },
  hockey: { 2: ["W", "L"], 3: ["W", "L", "OT"] },
  football: { 2: ["W", "L"], 3: ["W", "L", "T"] },
  basketball: { 2: ["W", "L"] },
  baseball: { 2: ["W", "L"] },
  tennis: {},
  golf: {},
};

export type RecordPart = { value: string; label: string };

export function readRecord(summary: string | undefined, sport: Sport): RecordPart[] {
  if (!summary) return [];

  const parts = summary.split("-").map((part) => part.trim());
  if (parts.some((part) => part === "" || !/^\d+$/.test(part))) return [];

  const labels = LABELS[sport][parts.length];
  if (!labels) return [];

  return parts.map((value, index) => ({ value, label: labels[index] ?? "" }));
}
