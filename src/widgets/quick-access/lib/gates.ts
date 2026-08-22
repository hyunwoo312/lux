import type { ItemSource } from "@/widgets/quick-access/types";

export type SectionGate = {
  permissions: chrome.runtime.ManifestPermission[];
  highlight: chrome.runtime.ManifestPermission;
  message: string;
  partlyGrantedMessage?: string;
};

export const SECTION_GATE: Record<Exclude<ItemSource, "history">, SectionGate> = {
  topSites: {
    permissions: ["topSites"],
    highlight: "topSites",
    message: "Turn on the Top sites permission to show your most-visited sites.",
  },
  openTabs: {
    permissions: ["tabs"],
    highlight: "tabs",
    message: "Turn on the Open tabs permission to manage your open tabs here.",
  },
  recentlyClosed: {
    permissions: ["sessions", "tabs"],
    highlight: "sessions",
    message: "Turn on the Recently closed tabs permission to list them here.",
    partlyGrantedMessage:
      "Chrome only reveals closed tabs’ titles to extensions that can read tab details. Enable that to list them here.",
  },
};
