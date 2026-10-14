import type { SettingEntry } from "@/settings/searchIndex";

export function resolveSettingDestination(root: HTMLElement, entry: SettingEntry) {
  const anchors = [...root.querySelectorAll<HTMLElement>("[data-setting-id]")];
  for (const id of [entry.settingId, ...(entry.fallbackIds ?? [])]) {
    const target = anchors.find((node) => node.dataset.settingId === id);
    if (!target || target.closest("[hidden], [inert], [aria-hidden='true']")) continue;
    if (entry.hint) {
      const controls = [...target.querySelectorAll<HTMLElement>("button, input, select, textarea")];
      if (
        controls.length &&
        controls.every((node) => node.matches(":disabled, [aria-disabled='true']"))
      )
        continue;
    }
    return { target, hint: id !== entry.settingId ? entry.hint : undefined };
  }
  return null;
}
