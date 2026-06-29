type ChangeType = "added" | "changed" | "deprecated" | "removed" | "fixed" | "security";

type ReleaseChange = {
  type: ChangeType;
  text: string;
};

export type Release = {
  version: string;
  date: string;
  changes: ReleaseChange[];
};

export const CHANGE_TYPE_ORDER: readonly ChangeType[] = [
  "added",
  "changed",
  "deprecated",
  "removed",
  "fixed",
  "security",
];

export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  added: "Added",
  changed: "Changed",
  deprecated: "Deprecated",
  removed: "Removed",
  fixed: "Fixed",
  security: "Security",
};

export const RELEASES: readonly Release[] = [
  {
    version: "1.0.1",
    date: "2026-06-28",
    changes: [
      {
        type: "added",
        text: "There's a “What's new” button in the toolbar now — give it a click whenever you want to see what changed.",
      },
      {
        type: "fixed",
        text: "Spotify and the calendar could spin on “loading” forever if a request stalled or your connection dropped. They let go gracefully now.",
      },
      {
        type: "fixed",
        text: "When an account's access expired or got pulled, Lux used to fail without a word. Now it actually asks you to reconnect.",
      },
      {
        type: "fixed",
        text: "The GitHub inbox no longer goes blank when just one part of it fails — you'll still get everything that loaded.",
      },
      {
        type: "fixed",
        text: "The AniList unread count keeps up properly after you clear your notifications.",
      },
      {
        type: "fixed",
        text: "Editing a Quick Access shortcut's URL now refreshes its icon to match.",
      },
      {
        type: "changed",
        text: "Keyboard focus is easier to follow, with clearer outlines as you tab through things.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-28",
    changes: [
      {
        type: "added",
        text: "🎉 Lux is officially out! This is the very first public release, so if you're here early — thank you, genuinely.",
      },
      {
        type: "added",
        text: "Your new tab is a real dashboard now: drag widgets around the grid and resize them to fit how you work.",
      },
      {
        type: "added",
        text: "Nine widgets to start with: Quick Access, Weather, Calendar, Tasks, Notes, Spotify, GitHub, AniList, and Image.",
      },
      {
        type: "added",
        text: "Connect Google, Microsoft, or GitHub. Sign-in runs through a tiny relay that holds onto nothing.",
      },
      {
        type: "added",
        text: "Every widget comes in two finishes, frosted Glass or solid, with full light and dark theming.",
      },
      {
        type: "added",
        text: "Nothing ever leaves your browser. No account, no analytics, no tracking — your setup stays yours.",
      },
      {
        type: "added",
        text: "Back up your whole setup to a file, restore it on another machine, or reset and start fresh.",
      },
    ],
  },
];
