import { z } from "zod";

const OPEN_BEHAVIORS = ["currentTab", "newTab"] as const;

export type OpenBehavior = (typeof OPEN_BEHAVIORS)[number];

export const openBehaviorSchema = z.enum(OPEN_BEHAVIORS).catch("currentTab");

export const OPEN_BEHAVIOR_OPTIONS: { value: OpenBehavior; label: string }[] = [
  { value: "currentTab", label: "This tab" },
  { value: "newTab", label: "New tab" },
];

const OPENABLE_SCHEMES = new Set(["http:", "https:"]);

export function isHttpUrl(url: string): boolean {
  try {
    return OPENABLE_SCHEMES.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

export const httpUrlSchema = z.string().refine(isHttpUrl);

export function openUrl(url: string, behavior: OpenBehavior): void {
  if (!isHttpUrl(url)) return;
  if (behavior === "newTab") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = url;
  }
}

const FALLBACK_SEARCH_URL = "https://www.google.com/search?q=";

export function searchWeb(query: string, behavior: OpenBehavior): void {
  const term = query.trim();
  if (term === "") return;
  if (typeof chrome === "undefined" || !chrome.search) {
    openUrl(`${FALLBACK_SEARCH_URL}${encodeURIComponent(term)}`, behavior);
    return;
  }
  void chrome.search
    .query({
      text: term,
      disposition: behavior === "newTab" ? "NEW_TAB" : "CURRENT_TAB",
    })
    .catch(() => openUrl(`${FALLBACK_SEARCH_URL}${encodeURIComponent(term)}`, behavior));
}
