const SUFFIXES: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };

export function parseTraffic(label: string): number | null {
  const match = /^\s*([\d.,]+)\s*([KMB])?\s*\+?\s*$/i.exec(label);
  if (!match?.[1]) return null;
  const digits = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(digits)) return null;
  const suffix = match[2]?.toUpperCase();
  return digits * (suffix ? (SUFFIXES[suffix] ?? 1) : 1);
}
