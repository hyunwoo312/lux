export type OpenBehavior = "currentTab" | "newTab";

export function openUrl(url: string, behavior: OpenBehavior): void {
  if (behavior === "newTab") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = url;
  }
}
