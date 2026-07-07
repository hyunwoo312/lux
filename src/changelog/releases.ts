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
    version: "1.1.2",
    date: "2026-07-07",
    changes: [
      {
        type: "added",
        text: "Removing a widget now asks first, with a dialog that says exactly what will be deleted — your saved tickers, tasks, note text, and so on.",
      },
      {
        type: "added",
        text: "Cleared completed tasks can be brought back — an Undo button sticks around for a few seconds after clearing.",
      },
      {
        type: "added",
        text: "Hover any widget’s refresh button to see how long ago its data was updated.",
      },
      {
        type: "added",
        text: "The welcome tour has a new step pointing to where accounts connect, and the Accounts page now says what each connection can access.",
      },
      {
        type: "changed",
        text: "Clearer wording wherever it matters: connect buttons say Connect, confirmation buttons say what they confirm, and reset or disconnect messages spell out what’s kept and what’s lost.",
      },
      {
        type: "changed",
        text: "Clearing background or Image-widget photos now asks for confirmation instead of deleting immediately.",
      },
      {
        type: "changed",
        text: "In the calendar’s week view the back-to-month button now sits next to the date range, and any event starting within the hour shows a countdown.",
      },
      {
        type: "fixed",
        text: "In the month view, clicking a multi-day event now opens the week with the day you clicked selected, instead of the day the event started.",
      },
      {
        type: "fixed",
        text: "GitHub and AniList now say when you’ve hit a rate limit and when to try again, instead of a generic error.",
      },
      {
        type: "fixed",
        text: "The Chrome Web Store link in About now opens Lux’s listing instead of the store homepage.",
      },
      {
        type: "fixed",
        text: "News headline timestamps now match the style used everywhere else (“2m ago”).",
      },
    ],
  },
  {
    version: "1.1.1",
    date: "2026-07-05",
    changes: [
      {
        type: "changed",
        text: "New tabs load a little lighter, and dragging or resizing widgets is smoother.",
      },
      {
        type: "fixed",
        text: "The clock now ticks over to the new minute right on time, instead of lagging by up to a minute.",
      },
      {
        type: "fixed",
        text: "After you switch AniList accounts, your currently-watching list updates to the new account instead of briefly showing the old one.",
      },
      {
        type: "fixed",
        text: "Turning a calendar on or off while a sync is already running now takes effect right away, instead of waiting for the next refresh.",
      },
      {
        type: "fixed",
        text: "Outlook calendars with a lot of events no longer cut off early — busier months show everything now.",
      },
      {
        type: "fixed",
        text: "The refresh button on Weather and Stocks now keeps spinning until every place or symbol has finished updating, instead of stopping after the first.",
      },
      {
        type: "fixed",
        text: "With wallpaper or Image-widget rotation set to “sequential,” new tabs now go in order instead of shuffling.",
      },
      {
        type: "fixed",
        text: "Tasks set to disappear when completed now clear even if you close the tab right after ticking them off.",
      },
      {
        type: "fixed",
        text: "The welcome tour no longer gets stuck if you press the right-arrow key on its last step.",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-07-02",
    changes: [
      {
        type: "added",
        text: "You can add more than one of any widget now — put two Notes side by side, track weather for several cities, whatever fits how you work.",
      },
      {
        type: "added",
        text: "New Stocks widget: a watchlist with live prices, the day's change, and an interactive mini-chart.",
      },
      {
        type: "added",
        text: "New News widget: top headlines from Google News, The New York Times, the BBC, and Yahoo News — switch sources with a tab, or search Google News.",
      },
      {
        type: "added",
        text: "Weather, Stocks, and Calendar now have a manual refresh button for when you don't want to wait for the next auto-update.",
      },
      {
        type: "changed",
        text: "New widgets now fill the row from left to right instead of stacking straight down, and the dashboard scrolls to whatever you just added.",
      },
      {
        type: "changed",
        text: "The toolbar stays pinned at the top now — only the widget area scrolls.",
      },
      {
        type: "changed",
        text: "The add-widget menu got a polish pass: it's alphabetized, hovers smoothly from item to item, previews where a widget will land, and lets you click or drag to add.",
      },
      {
        type: "changed",
        text: "The clock's colon no longer blinks — it was easy to mistake for the UI lagging.",
      },
      {
        type: "fixed",
        text: "The Notes widget no longer shows a second, redundant scrollbar.",
      },
      {
        type: "fixed",
        text: "Your dashboard no longer resets itself if it runs into a widget type it doesn't recognize — it quietly drops just that one and keeps everything else.",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-06-29",
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
