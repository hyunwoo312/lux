export function faviconUrl(pageUrl: string, size = 32): string | null {
  if (typeof chrome === "undefined" || !chrome.runtime?.getURL) return null;
  try {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", pageUrl);
    url.searchParams.set("size", String(size));
    return url.toString();
  } catch {
    return null;
  }
}
