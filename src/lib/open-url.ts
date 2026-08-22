export type OpenBehavior = "currentTab" | "newTab";

const EXECUTABLE_SCHEMES = new Set(["javascript:", "data:", "vbscript:"]);

function isSafeToOpen(url: string): boolean {
  try {
    return !EXECUTABLE_SCHEMES.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function openUrl(url: string, behavior: OpenBehavior): void {
  if (!isSafeToOpen(url)) return;
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
  void chrome.search.query({
    text: term,
    disposition: behavior === "newTab" ? "NEW_TAB" : "CURRENT_TAB",
  });
}
