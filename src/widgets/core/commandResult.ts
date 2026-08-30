import { openUrl } from "@/lib/open-url";
import { paletteOpenBehavior } from "@/stores/usePaletteStore";

export function openResult(url: string): void {
  openUrl(url, paletteOpenBehavior());
}

export function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}
