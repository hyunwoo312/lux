export type ChangeType = "added" | "changed" | "fixed";

const CHANGE_AREAS = [
  "Dashboard",
  "Command palette",
  "Accounts",
  "Settings",
  "Onboarding",
  "Feedback",
  "Guide",
  "AniList",
  "Calendar",
  "Clock",
  "GitHub",
  "Image",
  "News",
  "Note",
  "Quick Access",
  "Spotify",
  "Sports",
  "Stocks",
  "Tasks",
  "Weather",
] as const;

type ChangeArea = (typeof CHANGE_AREAS)[number];

export type ReleaseChange = {
  type: ChangeType;
  area: ChangeArea;
  text: string;
  highlight?: true;
};

type AreaGroup = { area: ChangeArea; changes: ReleaseChange[] };

export type Release = {
  version: string;
  date: string;
  summary: string;
  changes: ReleaseChange[];
};

export const CHANGE_TYPE_ORDER: readonly ChangeType[] = ["added", "changed", "fixed"];

export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  added: "Added",
  changed: "Changed",
  fixed: "Fixed",
};

export function sortChanges(changes: readonly ReleaseChange[]): ReleaseChange[] {
  return [...changes].sort((a, b) => CHANGE_AREAS.indexOf(a.area) - CHANGE_AREAS.indexOf(b.area));
}

export function highlightsOf(release: Release): ReleaseChange[] {
  return release.changes.filter((change) => change.highlight === true);
}

export function groupByArea(changes: readonly ReleaseChange[]): AreaGroup[] {
  const groups = new Map<ChangeArea, ReleaseChange[]>();
  for (const change of sortChanges(changes)) {
    const bucket = groups.get(change.area);
    if (bucket) bucket.push(change);
    else groups.set(change.area, [change]);
  }
  return [...groups].map(([area, list]) => ({
    area,
    changes: list.sort(
      (a, b) => CHANGE_TYPE_ORDER.indexOf(a.type) - CHANGE_TYPE_ORDER.indexOf(b.type),
    ),
  }));
}

export const RELEASES: readonly Release[] = [
  {
    version: "2.0.0",
    date: "2026-08-31",
    summary:
      "A command palette for everything Lux can do, wallpapers you can generate or choose, and a settings dialog rebuilt around what you actually change.",
    changes: [
      {
        type: "added",
        area: "Command palette",
        text: "Press Alt+T anywhere in the browser, or click the magnifying glass in the toolbar, to open a command palette over your dashboard.",
        highlight: true,
      },
      {
        type: "added",
        area: "Command palette",
        text: "Run your widgets from it: play a song, check your AniList feed, read your GitHub inbox, look up a stock, or see today\u2019s scores.",
        highlight: true,
      },
      {
        type: "added",
        area: "Command palette",
        text: "Search your bookmarks, browsing history, open tabs and most-visited sites from the same box, once you allow access.",
      },
      {
        type: "added",
        area: "Command palette",
        text: "Search the web, or hand a question straight to Claude or ChatGPT, without leaving the page.",
      },
      {
        type: "added",
        area: "Command palette",
        text: "Some commands open a search of their own, so you can find a track and play it, or find a repository and open it, without leaving the palette.",
      },
      {
        type: "added",
        area: "Command palette",
        text: "Every command is listed whether or not it can run yet. The ones still waiting on an account, a widget or a permission say what they need, and pressing one takes you straight there.",
        highlight: true,
      },
      {
        type: "added",
        area: "Command palette",
        text: "The commands you use most rise to the top of the list on their own.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Wallpapers now come in three kinds: patterns Lux draws to match your theme, a bundled gallery, or your own images \u2014 each with its own options for motion, blur and dimming.",
        highlight: true,
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Removing a widget can be undone from a bar that counts down before it commits.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Widgets resize from any edge or corner, and the grid grows with your window instead of staying a fixed width.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "A crash anywhere on the page now shows a recovery card with your backup close at hand, instead of an empty tab.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "The accent colour you pick is used across the whole app, and only ever to signal something \u2014 what is selected, live, or about to be destroyed.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "Widgets that read the same thing now share one request, so several widgets on one service refresh together instead of each asking separately.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "A generated wallpaper stops animating when you switch tabs or move to another window, so it costs nothing while you are elsewhere.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "The header clock is configurable, its digits roll as they change, and the whole toolbar is one stop for the keyboard.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "Stale data is now shown as stale, with the time it was last good, instead of quietly looking current.",
      },
      {
        type: "added",
        area: "Settings",
        text: "Settings is now one dialog with tabs for Appearance, Widgets, Accounts, Shortcuts, Command palette, Storage and About, and a search that finds any setting by name.",
        highlight: true,
      },
      {
        type: "added",
        area: "Settings",
        text: "Every widget type has a default surface and refresh rate you can set once.",
      },
      {
        type: "added",
        area: "Settings",
        text: "Storage shows exactly what Lux is keeping, lets you clear cached data, and backs your whole setup up to a file you can restore.",
      },
      {
        type: "added",
        area: "Settings",
        text: "Keyboard shortcuts can be rebound, and the Command palette tab lists every command so you can switch off any you would rather never be offered.",
      },
      {
        type: "fixed",
        area: "Accounts",
        text: "A failed read no longer rebuilds your account list from nothing, and a refreshed token is kept rather than discarded.",
      },
      {
        type: "added",
        area: "Guide",
        text: "A guide now lives in the toolbar, with a walkthrough of every widget, the toolbar, and the command palette.",
      },
      {
        type: "added",
        area: "Onboarding",
        text: "A first-run welcome explains what Lux is and hands you straight to the guide.",
      },
      {
        type: "changed",
        area: "Feedback",
        text: "The feedback form is shorter, and morphs into its confirmation instead of claiming an outcome it cannot know.",
      },
      {
        type: "added",
        area: "AniList",
        text: "Three views \u2014 your feed, your library and a searchable Discover \u2014 with cover grids and progress you can change from the widget.",
      },
      {
        type: "added",
        area: "Calendar",
        text: "An agenda timeline and a month view, with a Go to today button and animation between dates.",
      },
      {
        type: "added",
        area: "GitHub",
        text: "An inbox grouped by repository, and a contributions heatmap that reports what it actually has.",
      },
      {
        type: "added",
        area: "News",
        text: "A Trending view, and sources that admit when a feed has failed instead of showing nothing.",
      },
      {
        type: "added",
        area: "Note",
        text: "Lists that continue as you type, and pasted text that keeps its shape.",
      },
      {
        type: "added",
        area: "Quick Access",
        text: "Your real links, a search box, and your open tabs.",
      },
      {
        type: "added",
        area: "Spotify",
        text: "A media bar, your playlists in search, and a transport that queues your presses instead of dropping them.",
      },
      {
        type: "added",
        area: "Sports",
        text: "Match detail, golf leaderboards and tennis draws, alongside the leagues and teams you follow.",
      },
      {
        type: "added",
        area: "Stocks",
        text: "A draggable card grid, and a detail view that leads with the chart.",
      },
      {
        type: "added",
        area: "Weather",
        text: "A nowcast, an hourly chart, and wind units you can choose.",
      },
      {
        type: "fixed",
        area: "Spotify",
        text: "The progress bar no longer jumps backwards when you pause.",
      },
      {
        type: "fixed",
        area: "Image",
        text: "Photos paint from their thumbnail first, and the details you add to them survive a reload.",
      },
      {
        type: "fixed",
        area: "Tasks",
        text: "The empty placeholder row is gone, and tasks use the same controls as everything else.",
      },
    ],
  },
  {
    version: "1.3.2",
    date: "2026-08-18",
    summary:
      "Lighter background images, a cleaner frosted backdrop, and an AniList sign-in that finishes on its own.",
    changes: [
      {
        type: "changed",
        area: "Dashboard",
        text: "The drop preview now takes on the accent color of the widget you’re placing, so it’s easier to see where it will land.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "Opening the widget menu no longer highlights the first widget before you point at anything.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "The frosted backdrop behind widgets is no longer blocky over a custom background, and it is reused between tabs instead of being blurred again each time.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "A widget whose request stalls now settles into its error state instead of loading forever.",
      },
      {
        type: "changed",
        area: "Accounts",
        text: "Disconnecting an account now asks in the same confirmation dialog used everywhere else, instead of swapping the buttons in the row.",
      },
      {
        type: "changed",
        area: "Settings",
        text: "Background images are converted to WebP when you add them, so a photo takes a fraction of the space and is far less likely to be dropped when browser storage fills up.",
      },
      {
        type: "fixed",
        area: "Settings",
        text: "The permissions list now accounts for every permission Lux holds, including unlimited local storage, instead of leaving one out.",
      },
      {
        type: "fixed",
        area: "Settings",
        text: "Help previews the same keyboard shortcuts you can rebind, instead of a fixed pair that could fall behind.",
      },
      {
        type: "fixed",
        area: "AniList",
        text: "Signing in no longer leaves the callback tab spinning on “Finishing AniList sign-in” — it closes on its own, even if you moved away from the Lux tab while signing in.",
      },
    ],
  },
  {
    version: "1.3.1",
    date: "2026-08-15",
    summary:
      "Steadier account refreshes, tidier Sports detail, and a dashboard that copes when browser storage fills up.",
    changes: [
      {
        type: "fixed",
        area: "Dashboard",
        text: "Running out of browser storage no longer quietly stops your theme from being remembered — Lux clears its oldest cached widget data to make room, and tells you in Settings if it still can’t save.",
        highlight: true,
      },
      {
        type: "fixed",
        area: "Accounts",
        text: "Two accounts refreshing at the same moment no longer overwrite each other’s sign-in, which could leave one of them asking to be reconnected.",
        highlight: true,
      },
      {
        type: "changed",
        area: "Sports",
        text: "Match detail now names its list — probable starters before the game, top performers during it — and shows up to three per team, without repeating a player who leads more than one stat.",
      },
      {
        type: "fixed",
        area: "GitHub",
        text: "A pull request notification now opens the pull request itself, instead of a broken link when the repository or its owner is named “pulls”.",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-08-10",
    summary:
      "A Sports widget, in-app feedback, and a much deeper AniList, Calendar and Quick Access.",
    changes: [
      {
        type: "added",
        area: "Sports",
        text: "A new widget: live and upcoming scores for the leagues and teams you follow — NFL, NBA, WNBA, MLB, and NHL. Open a game for the line score, game leaders, and detail that keeps up while it’s live. No account needed.",
        highlight: true,
      },
      {
        type: "added",
        area: "Feedback",
        text: "A button now sits beside What’s new in the toolbar. Send a bug, an idea, or anything else straight to the developer — with an optional email if you’d like a reply, and diagnostics only if you choose to include them.",
        highlight: true,
      },
      {
        type: "added",
        area: "Calendar",
        text: "Events now carry a one-tap join link for Google Meet, Teams, and other video meetings, so you can get into your 10am without hunting for the invite.",
      },
      {
        type: "added",
        area: "Calendar",
        text: "Shows your RSVP status at a glance and flags the invitations still waiting on an answer.",
      },
      {
        type: "added",
        area: "Calendar",
        text: "Tells you how long you’re free before your next event — handy for knowing whether that’s enough time to start something.",
      },
      {
        type: "added",
        area: "AniList",
        text: "A new airing view: what’s out today, tomorrow, and across the rest of the week, with countdowns to each episode.",
        highlight: true,
      },
      {
        type: "added",
        area: "AniList",
        text: "The Current tab is now a full library — filter by status, jump to your planning backlog, and page through everything as you scroll.",
      },
      {
        type: "added",
        area: "AniList",
        text: "The Discover tab is browsable and knows what’s already on your list, so you can spot something new without checking twice.",
      },
      {
        type: "added",
        area: "GitHub",
        text: "A releases tab showing the latest versions from the repositories you watch.",
      },
      {
        type: "added",
        area: "Stocks",
        text: "Tracks the S&P 500, Nasdaq, and Dow above your watchlist, so you can see the market’s direction alongside your own symbols.",
      },
      {
        type: "added",
        area: "Quick Access",
        text: "Browse your bookmarks folder by folder instead of only seeing a flat list.",
      },
      {
        type: "added",
        area: "Spotify",
        text: "Shows the playlist or album the current track is playing from.",
      },
      {
        type: "changed",
        area: "Quick Access",
        text: "Loads more of your bookmarks, history, and recently closed tabs as you scroll, rather than quietly stopping at the first page.",
      },
      {
        type: "changed",
        area: "Quick Access",
        text: "The Recently closed list needs one more browser permission than before, so its toggle in Settings will read as off after this update. Chrome withholds the title and address of a closed tab without it, which is why that list used to come up blank. Turn it back on and it will work properly.",
      },
      {
        type: "changed",
        area: "GitHub",
        text: "Now starts at a slightly larger minimum size, so its tabs have room to breathe.",
      },
      {
        type: "fixed",
        area: "Spotify",
        text: "Search now lets you play to any of your available devices, instead of refusing to work until one was already active — and it shows your results right away rather than waiting on your saved-track state.",
      },
      {
        type: "fixed",
        area: "Accounts",
        text: "A failed token refresh no longer signs you out of a connected account. A dropped connection or a slow network is treated as temporary, and your account stays put.",
      },
      {
        type: "fixed",
        area: "GitHub",
        text: "Now keeps telling you when part of your inbox failed to load, instead of dropping the warning as soon as the widget reloaded from its cache.",
      },
      {
        type: "fixed",
        area: "Quick Access",
        text: "The pin marker now uses the widget’s own accent colour, instead of ignoring it.",
      },
    ],
  },
  {
    version: "1.2.1",
    date: "2026-07-31",
    summary:
      "Note export, a fuller weather forecast, and a batch of fixes to backups and shortcuts.",
    changes: [
      {
        type: "added",
        area: "Note",
        text: "Copy a note to the clipboard or save it as a text file, straight from the widget’s header.",
      },
      {
        type: "added",
        area: "Quick Access",
        text: "Open all of your pinned links at once, each in its own tab.",
      },
      {
        type: "added",
        area: "Weather",
        text: "The hourly forecast now runs 48 hours instead of 24.",
      },
      {
        type: "added",
        area: "GitHub",
        text: "The contribution graph shows your best day and your daily average alongside your current and longest streaks.",
      },
      {
        type: "added",
        area: "Spotify",
        text: "Marks the track that’s playing when it’s already saved to your library.",
      },
      {
        type: "changed",
        area: "Settings",
        text: "Restoring a settings backup now replaces your settings instead of merging them into what’s already there, so a restored dashboard matches the backup exactly. Your connected accounts stay signed in either way.",
      },
      {
        type: "fixed",
        area: "Settings",
        text: "Picking the wrong file when restoring a backup now says what went wrong, instead of showing a raw error message.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "Lists you’ve expanded with “load more” — like AniList activity — no longer snap back to the first page when they refresh in the background.",
      },
      {
        type: "fixed",
        area: "Settings",
        text: "The same keyboard shortcut can no longer be saved into both slots for one action, leaving the second slot wasted.",
      },
      {
        type: "fixed",
        area: "Settings",
        text: "The GitHub star count in About no longer goes missing after opening Settings several times.",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-07-20",
    summary:
      "News and Stocks grew up, the GitHub inbox became actionable, and new installs start with a real dashboard.",
    changes: [
      {
        type: "added",
        area: "Onboarding",
        text: "New installs open to a starter dashboard — clock, weather, tasks, a note, and quick access — instead of a blank grid.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "The Add-widget picker now describes each widget, flags the recommended ones, and shows a live preview — including account widgets before you sign in.",
      },
      {
        type: "added",
        area: "News",
        text: "Shows image tiles, merges every enabled source into one “All” feed, and adds The Guardian and NPR alongside regional editions (US, UK, Australia, International).",
      },
      {
        type: "added",
        area: "News",
        text: "Filter any news source by topic — World, Business, Technology, Science, or Sports — mute or highlight keywords, and see read and new markers plus a note when several outlets cover the same story.",
      },
      {
        type: "added",
        area: "Spotify",
        text: "Spotify gained an Up Next queue: see what’s coming, add tracks to it from search, and jump ahead to any track.",
      },
      {
        type: "added",
        area: "GitHub",
        text: "The inbox can act on notifications — mark read, unsubscribe, or mark all read — and surfaces issues assigned to you and where you’re mentioned.",
      },
      {
        type: "added",
        area: "Stocks",
        text: "Now supports crypto and currencies, shows pre- and post-market prices, adds year-to-date, 5-year, and max ranges, and tells you when a closed market reopens.",
      },
      {
        type: "added",
        area: "Image",
        text: "A slow pan-and-zoom, per-image captions and focal points, more transition styles, a one-tap “set as dashboard background”, and automatic compression to save space.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Weather has a scrollable 24-hour forecast, the Tasks widget shows a completion bar, and AniList’s Discover tab is now available while signed in.",
      },
      {
        type: "fixed",
        area: "Accounts",
        text: "Connecting and refreshing accounts is more reliable across multiple open tabs and after reconnecting — tokens are no longer dropped and accounts no longer get stuck needing a reconnect.",
      },
      {
        type: "fixed",
        area: "AniList",
        text: "AniList scores display in your chosen format (100-point, 10-point, 5-star, or 3-smiley) instead of a raw number.",
      },
      {
        type: "fixed",
        area: "GitHub",
        text: "The inbox shows when a section fails to load instead of looking empty, and reports GitHub rate limits.",
      },
      {
        type: "fixed",
        area: "Stocks",
        text: "Recovers from rate limits by failing over to a backup data source, and calendars with very large event counts no longer drop the extras.",
      },
    ],
  },
  {
    version: "1.1.2",
    date: "2026-07-07",
    summary:
      "Safer destructive actions, clearer wording throughout, and a calendar that behaves in week view.",
    changes: [
      {
        type: "added",
        area: "Dashboard",
        text: "Removing a widget now asks first, with a dialog that says exactly what will be deleted — your saved tickers, tasks, note text, and so on.",
      },
      {
        type: "added",
        area: "Tasks",
        text: "Cleared completed tasks can be brought back — an Undo button sticks around for a few seconds after clearing.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Hover any widget’s refresh button to see how long ago its data was updated.",
      },
      {
        type: "added",
        area: "Onboarding",
        text: "The welcome tour has a new step pointing to where accounts connect, and the Accounts page now says what each connection can access.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "Clearer wording wherever it matters: connect buttons say Connect, confirmation buttons say what they confirm, and reset or disconnect messages spell out what’s kept and what’s lost.",
      },
      {
        type: "changed",
        area: "Image",
        text: "Clearing background or Image-widget photos now asks for confirmation instead of deleting immediately.",
      },
      {
        type: "changed",
        area: "Calendar",
        text: "In the calendar’s week view the back-to-month button now sits next to the date range, and any event starting within the hour shows a countdown.",
      },
      {
        type: "fixed",
        area: "Calendar",
        text: "In the month view, clicking a multi-day event now opens the week with the day you clicked selected, instead of the day the event started.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "GitHub and AniList now say when you’ve hit a rate limit and when to try again, instead of a generic error.",
      },
      {
        type: "fixed",
        area: "Settings",
        text: "The Chrome Web Store link in About now opens Lux’s listing instead of the store homepage.",
      },
      {
        type: "fixed",
        area: "News",
        text: "News headline timestamps now match the style used everywhere else (“2m ago”).",
      },
    ],
  },
  {
    version: "1.1.1",
    date: "2026-07-05",
    summary: "A lighter new tab and a long list of timing and sync fixes.",
    changes: [
      {
        type: "changed",
        area: "Dashboard",
        text: "New tabs load a little lighter, and dragging or resizing widgets is smoother.",
      },
      {
        type: "fixed",
        area: "Clock",
        text: "The clock now ticks over to the new minute right on time, instead of lagging by up to a minute.",
      },
      {
        type: "fixed",
        area: "AniList",
        text: "After you switch AniList accounts, your currently-watching list updates to the new account instead of briefly showing the old one.",
      },
      {
        type: "fixed",
        area: "Calendar",
        text: "Turning a calendar on or off while a sync is already running now takes effect right away, instead of waiting for the next refresh.",
      },
      {
        type: "fixed",
        area: "Calendar",
        text: "Outlook calendars with a lot of events no longer cut off early — busier months show everything now.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "The refresh button on Weather and Stocks now keeps spinning until every place or symbol has finished updating, instead of stopping after the first.",
      },
      {
        type: "fixed",
        area: "Image",
        text: "With wallpaper or Image-widget rotation set to “sequential,” new tabs now go in order instead of shuffling.",
      },
      {
        type: "fixed",
        area: "Tasks",
        text: "Tasks set to disappear when completed now clear even if you close the tab right after ticking them off.",
      },
      {
        type: "fixed",
        area: "Onboarding",
        text: "The welcome tour no longer gets stuck if you press the right-arrow key on its last step.",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-07-02",
    summary: "Multiple copies of any widget, plus new Stocks and News widgets.",
    changes: [
      {
        type: "added",
        area: "Dashboard",
        text: "You can add more than one of any widget now — put two Notes side by side, track weather for several cities, whatever fits how you work.",
      },
      {
        type: "added",
        area: "Stocks",
        text: "A new widget: a watchlist with live prices, the day's change, and an interactive mini-chart.",
      },
      {
        type: "added",
        area: "News",
        text: "A new widget: top headlines from Google News, The New York Times, the BBC, and Yahoo News — switch sources with a tab, or search Google News.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Weather, Stocks, and Calendar now have a manual refresh button for when you don't want to wait for the next auto-update.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "New widgets now fill the row from left to right instead of stacking straight down, and the dashboard scrolls to whatever you just added.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "The toolbar stays pinned at the top now — only the widget area scrolls.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "The add-widget menu got a polish pass: it's alphabetized, hovers smoothly from item to item, previews where a widget will land, and lets you click or drag to add.",
      },
      {
        type: "changed",
        area: "Clock",
        text: "The clock's colon no longer blinks — it was easy to mistake for the UI lagging.",
      },
      {
        type: "fixed",
        area: "Note",
        text: "No longer shows a second, redundant scrollbar.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "Your dashboard no longer resets itself if it runs into a widget type it doesn't recognize — it quietly drops just that one and keeps everything else.",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-06-29",
    summary: "A What’s-new dialog and the first round of reliability fixes.",
    changes: [
      {
        type: "added",
        area: "Dashboard",
        text: "There's a “What's new” button in the toolbar now — give it a click whenever you want to see what changed.",
      },
      {
        type: "fixed",
        area: "Dashboard",
        text: "Spotify and the calendar could spin on “loading” forever if a request stalled or your connection dropped. They let go gracefully now.",
      },
      {
        type: "fixed",
        area: "Accounts",
        text: "When an account's access expired or got pulled, Lux used to fail without a word. Now it actually asks you to reconnect.",
      },
      {
        type: "fixed",
        area: "GitHub",
        text: "The inbox no longer goes blank when just one part of it fails — you'll still get everything that loaded.",
      },
      {
        type: "fixed",
        area: "AniList",
        text: "The AniList unread count keeps up properly after you clear your notifications.",
      },
      {
        type: "fixed",
        area: "Quick Access",
        text: "Editing a Quick Access shortcut's URL now refreshes its icon to match.",
      },
      {
        type: "changed",
        area: "Dashboard",
        text: "Keyboard focus is easier to follow, with clearer outlines as you tab through things.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-28",
    summary: "The first public release of Lux.",
    changes: [
      {
        type: "added",
        area: "Dashboard",
        text: "🎉 Lux is officially out! This is the very first public release, so if you're here early — thank you, genuinely.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Your new tab is a real dashboard now: drag widgets around the grid and resize them to fit how you work.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Nine widgets to start with: Quick Access, Weather, Calendar, Tasks, Notes, Spotify, GitHub, AniList, and Image.",
      },
      {
        type: "added",
        area: "Accounts",
        text: "Connect Google, Microsoft, or GitHub. Sign-in runs through a tiny relay that holds onto nothing.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Every widget comes in two finishes, frosted Glass or solid, with full light and dark theming.",
      },
      {
        type: "added",
        area: "Dashboard",
        text: "Nothing ever leaves your browser. No account, no analytics, no tracking — your setup stays yours.",
      },
      {
        type: "added",
        area: "Settings",
        text: "Back up your whole setup to a file, restore it on another machine, or reset and start fresh.",
      },
    ],
  },
];
