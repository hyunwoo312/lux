import type { ComponentType } from "react";
import {
  AppWindow,
  Bookmark,
  Clock,
  Database,
  HardDrive,
  History,
  ImageIcon,
  KeyRound,
  LayoutGrid,
  Search,
} from "lucide-react";

export type PermissionItem = {
  id: chrome.runtime.ManifestPermission;
  alsoNeeds?: chrome.runtime.ManifestPermission[];
  name: string;
  description: string;
  usedBy: string;
  icon: ComponentType<{ className?: string }>;
  required: boolean;
};

export const PERMISSIONS: PermissionItem[] = [
  {
    id: "bookmarks",
    name: "Bookmarks",
    description: "Browse and search your bookmarks in Quick Access.",
    usedBy: "Quick Access",
    icon: Bookmark,
    required: false,
  },
  {
    id: "history",
    name: "Browsing history",
    description: "Suggests recently visited sites in Quick Access.",
    usedBy: "Quick Access",
    icon: History,
    required: false,
  },
  {
    id: "sessions",
    alsoNeeds: ["tabs"],
    name: "Recently closed tabs",
    description:
      "Lists recently closed tabs in Quick Access. Chrome only reveals their titles and addresses to extensions that can read tab details, so this asks for both. Changing this reloads the page.",
    usedBy: "Quick Access",
    icon: Clock,
    required: false,
  },
  {
    id: "tabs",
    name: "Open tabs",
    description:
      "Lists your open tabs in Quick Access so you can switch to, close or mute one. Lux never injects into a tab or follows what you browse. Changing this reloads the page.",
    usedBy: "Quick Access",
    icon: AppWindow,
    required: false,
  },
  {
    id: "topSites",
    name: "Top sites",
    description: "Shows your most-visited sites in Quick Access.",
    usedBy: "Quick Access",
    icon: LayoutGrid,
    required: false,
  },
  {
    id: "storage",
    name: "Local storage",
    description: "Saves your dashboard, widgets, and settings on this device.",
    usedBy: "Everywhere",
    icon: HardDrive,
    required: true,
  },
  {
    id: "unlimitedStorage",
    name: "Unlimited local storage",
    description:
      "Lifts the browser's storage cap so background images and cached widget data fit on disk.",
    usedBy: "Backgrounds",
    icon: Database,
    required: true,
  },
  {
    id: "identity",
    name: "Account sign-in",
    description: "Connects Google, Outlook, Spotify, and GitHub with OAuth.",
    usedBy: "Accounts",
    icon: KeyRound,
    required: true,
  },
  {
    id: "search",
    name: "Web search",
    description: "Sends a trending topic to the search engine you already use, not a fixed one.",
    usedBy: "News",
    icon: Search,
    required: true,
  },
  {
    id: "favicon",
    name: "Site icons",
    description: "Shows favicons for links and search results.",
    usedBy: "Links & search",
    icon: ImageIcon,
    required: true,
  },
];
