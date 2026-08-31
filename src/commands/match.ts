import type { CommandItem, CommandSection } from "@/commands/items";
import { COMMAND_SECTIONS } from "@/commands/items";
import { frecencyBoost } from "@/stores/usePaletteStore";

const WORD_BOUNDARY = /[\s\-_/.:]/;

const CONFIDENT_MATCH = 700;

const ALWAYS_OFFERED = 1;

function isWordStart(text: string, index: number): boolean {
  return index === 0 || WORD_BOUNDARY.test(text[index - 1] ?? "");
}

export function score(text: string, query: string): number | null {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  if (needle.length === 0) return 0;
  if (haystack === needle) return 1000;

  const direct = haystack.indexOf(needle);
  if (direct === 0) return 900;
  if (direct > 0) return (isWordStart(haystack, direct) ? 800 : 650) - Math.min(direct, 50);

  let cursor = 0;
  let previous = -1;
  let gaps = 0;
  for (const character of needle) {
    const found = haystack.indexOf(character, cursor);
    if (found === -1) return null;
    if (previous !== -1 && found !== previous + 1) gaps += 1;
    previous = found;
    cursor = found + 1;
  }
  return Math.max(1, 400 - gaps * 20 - Math.min(previous, 50));
}

export function scoreItem(item: CommandItem, query: string): number | null {
  const candidates: [string, number][] = [
    [item.label, 1],
    ...(item.keywords ?? []).map((keyword) => [keyword, 0.8] as [string, number]),
  ];

  let best: number | null = null;
  for (const [text, weight] of candidates) {
    const raw = score(text, query);
    if (raw === null) continue;
    const weighted = raw * weight;
    if (best === null || weighted > best) best = weighted;
  }
  return best;
}

export function matchItems(items: readonly CommandItem[], query: string): CommandItem[] {
  const now = Date.now();
  const scored: { item: CommandItem; value: number }[] = [];
  for (const item of items) {
    if (item.section === "search") {
      scored.push({ item, value: ALWAYS_OFFERED });
      continue;
    }
    const value = scoreItem(item, query);
    if (value !== null) scored.push({ item, value: value + frecencyBoost(item.id, now) });
  }

  const confident = scored.some(
    ({ item, value }) => item.section !== "search" && value >= CONFIDENT_MATCH,
  );
  const sections: readonly CommandSection[] = confident
    ? COMMAND_SECTIONS
    : ["search", ...COMMAND_SECTIONS.filter((section) => section !== "search")];

  const rank = (item: CommandItem) => sections.indexOf(item.section);
  const ready = (item: CommandItem) => (item.setup == null ? 0 : 1);
  return scored
    .sort(
      (a, b) => rank(a.item) - rank(b.item) || ready(a.item) - ready(b.item) || b.value - a.value,
    )
    .map(({ item }) => item);
}
