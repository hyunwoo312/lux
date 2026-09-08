import { openUrl } from "@/lib/open-url";
import { paletteOpenBehavior } from "@/stores/usePaletteStore";

export function openResult(url: string): void {
  openUrl(url, paletteOpenBehavior());
}
