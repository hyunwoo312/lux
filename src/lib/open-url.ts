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
