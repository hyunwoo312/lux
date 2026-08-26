import type { ArticleLocation, GuideArticle, GuideBlock, GuideGroup } from "./types.ts";
import { PRIVACY_URL } from "../lib/links.ts";

const GETTING_STARTED: readonly GuideArticle[] = [
  {
    id: "what-is-lux",
    title: "What Lux is",
    lead: "Lux replaces the new tab page with a dashboard you arrange yourself. There is no Lux account to create — your layout lives in this browser.",
    blocks: [
      {
        kind: "prose",
        text: "Open a new tab and you get your own layout instead of a search box: the weather where you are, what is next on your calendar, the notes and tasks you keep coming back to. You add, move and resize widgets, and Lux remembers how you left it.",
      },
      {
        kind: "figure",
        media: "example-dashboard",
        alt: "A dashboard with news, stocks, sports, notes, music, weather and calendar widgets over a photo wallpaper",
        caption: "One setup, with every widget sized and placed to taste.",
      },
      {
        kind: "callout",
        title: "Where your data lives",
        text: "Your layout, notes and settings are stored in this browser. Widgets fetch straight from the services they show — weather, news, your calendar — and Lux keeps no copy of any of it on a server. Signing in to Microsoft or GitHub is the one exception: the last step passes through a small Lux relay, because those providers require a secret that cannot ship inside an extension. The relay completes the exchange and stores nothing. Google sign-in goes through Chrome itself and never reaches the relay.",
      },
      { kind: "link", href: PRIVACY_URL, label: "Read the privacy policy" },
    ],
  },
  {
    id: "the-toolbar",
    title: "The toolbar",
    lead: "The controls in the top-right corner are how you change the dashboard. Here they are, numbered to match the list below.",
    blocks: [
      {
        kind: "toolbar",
        steps: [
          {
            title: "Light and dark",
            text: "Flips between the two themes. The change sweeps across the page instead of snapping, and Lux remembers which one you chose.",
          },
          {
            title: "Add a widget",
            text: "Opens the widget palette. Pick anything from the list and it drops into the first free space on your grid — or drag it exactly where you want it.",
          },
          {
            title: "Edit your layout",
            text: "Turns on edit mode, where widgets can be dragged, resized and removed. Press it again — or hit `Esc` — when you are finished.",
          },
          {
            title: "Settings",
            text: "Everything that is not a widget: theme defaults, your wallpaper, connected accounts, keyboard shortcuts, and backing your setup up to a file.",
          },
          {
            title: "Release notes, this guide, and feedback",
            text: "The last three sit together. The scroll shows what changed in each version, the book opens this guide, and the message icon sends a note straight to the developer.",
          },
        ],
      },
    ],
  },
  {
    id: "customizing",
    title: "Customizing your dashboard",
    lead: "Nothing here is fixed. Put widgets where you want them, size them how you like, and give each one its own look.",
    blocks: [
      {
        kind: "prose",
        text: "Press the pencil in the toolbar to start editing. Drag a widget anywhere on the grid and the others move aside to make room; grab its bottom-right corner to make it bigger or smaller. Every widget gets a remove button while you are editing, and pressing the pencil again — or `Esc` — puts things back to normal.",
      },
      {
        kind: "figure",
        media: "using-arrange",
        alt: "Moving and resizing widgets in edit mode",
        caption: "Drag to move, drag the corner to resize.",
      },
      {
        kind: "prose",
        text: "Each widget also has its own settings, behind the gear in its header — you will find it when you are *not* in edit mode. That is where you switch it between the frosted glass look and a solid one, give it its own accent colour, and change whatever that particular widget offers. Widgets that fetch things, like Weather, Stocks and Calendar, also have a refresh button there.",
      },
      {
        kind: "figure",
        media: "using-widget-settings",
        alt: "A widget's settings, showing surface and accent options",
        caption: "Surface, accent and per-widget options all live here.",
      },
      {
        kind: "callout",
        title: "Want two of something?",
        text: "You can add more than one of the same widget. Two notes, two clocks, a Weather for home and another for wherever you are travelling — add them the same way you added the first.",
      },
    ],
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    lead: "Much of the dashboard can be driven from the keyboard, and every binding can be changed.",
    blocks: [
      {
        kind: "prose",
        text: "Shortcuts only fire when focus is outside a text field, so typing in a note or a search box will not trigger them by accident. `Esc` leaves edit mode.",
      },
      {
        kind: "settingsLink",
        tab: "shortcuts",
        label: "Edit keyboard shortcuts",
      },
    ],
  },
];

const WIDGET_BLOCKS: Record<string, GuideBlock[]> = {
  anilist: [
    {
      kind: "prose",
      text: "Sign in to see your own list, or browse without signing in at all. Three tabs, and the widget remembers which one you left it on.",
    },
    {
      kind: "figure",
      media: "anilist-overview",
      alt: "Moving between the AniList widget's tabs",
      caption: "Feed, Library and Discover, and the detail view behind a title.",
    },
    {
      kind: "prose",
      text: "**Feed** is what the people you follow are watching and reading, each with a one-tap like. **Notifications** sits beside it, with a count when something you follow airs or someone likes you back.",
    },
    {
      kind: "figure",
      media: "anilist-feed",
      alt: "The AniList Feed tab, showing activity from people you follow",
      caption: "Activity from the people you follow.",
    },
    {
      kind: "prose",
      text: "**Library** is your own list — progress, how far behind you are, and filters for status or for what is airing soon.",
    },
    {
      kind: "prose",
      text: "**Discover** searches anime and manga, sorts by popular, trending, score or upcoming, and lets you browse the covers. Anything already on your list is badged with where you left it.",
    },
    {
      kind: "figure",
      media: "anilist-discover",
      alt: "The AniList Discover tab, browsing manga covers",
      caption: "Your own status, badged onto each cover.",
    },
  ],
  calendar: [
    {
      kind: "prose",
      text: "**Agenda** puts the day on a time axis, with all-day items in a row above it.",
    },
    {
      kind: "figure",
      media: "calendar-agenda-motion",
      alt: "Scrolling through the agenda timeline",
      caption: "The day, top to bottom.",
    },
    {
      kind: "prose",
      text: "The gaps get named too — *2h free until 14:00*, *Nothing until Thu, 09:00* — so you can read the shape of a day, not just its contents.",
    },
    {
      kind: "figure",
      media: "calendar-agenda",
      alt: "The Agenda view, a timeline of the day's events",
      caption: "Agenda view.",
    },
    {
      kind: "prose",
      text: "**Calendar** lays out the month instead, and today is marked.",
    },
    {
      kind: "figure",
      media: "calendar-month-motion",
      alt: "Moving between months in the calendar grid",
      caption: "Paging through the months.",
    },
    {
      kind: "prose",
      text: "Multi-day events draw as one continuous bar rather than repeating, and a busy day collapses to **+N more**.",
    },
    {
      kind: "figure",
      media: "calendar-month",
      alt: "The Calendar view, a month grid with event bars",
      caption: "Calendar view.",
    },
    {
      kind: "prose",
      text: "Events keep their join link for Meet or Teams, show your RSVP with pending invitations flagged, and open on the provider's site if you need the full detail.",
    },
  ],
  email: [
    {
      kind: "prose",
      text: "Your Gmail and Outlook inboxes merged into one list, newest first and grouped by how recently each message arrived. Each row shows the sender with their initials, the subject, the first couple of lines, and how long ago it arrived, with a paperclip when something is attached. Unread messages sit at full strength; ones you have read fade back.",
    },
    {
      kind: "prose",
      text: "**All**, **Gmail** and **Outlook** switch between the merged list and one mailbox at a time, and each tab carries a badge counting what is unread behind it. All keeps both in true date order as you scroll, fetching more from whichever mailbox is busier. The search above the list queries your whole inbox on the server, not just the messages already loaded, and the widget settings choose how many arrive per load.",
    },
    {
      kind: "prose",
      text: "Lux reads your mail but never writes to it — nothing you do here can change a message, and opening one hands you to Gmail or Outlook rather than showing it in the widget.",
    },
    {
      kind: "prose",
      text: "Connect either mailbox, or both. If one provider fails to load, the other still shows and the widget says which one is missing.",
    },
  ],
  github: [
    {
      kind: "prose",
      text: "Your GitHub activity without opening GitHub — what you have shipped, and what is waiting on you.",
    },
    {
      kind: "figure",
      media: "github-overview",
      alt: "Moving between the GitHub widget's tabs",
      caption: "Contributions, Inbox and Releases.",
    },
    {
      kind: "prose",
      text: "**Contributions** is the heatmap, your current and longest streaks, and which repositories the work actually went into — ranked, with commits and pull requests counted separately.",
    },
    {
      kind: "figure",
      media: "github-contributions",
      alt: "The Contributions tab with heatmap and streaks",
      caption: "Where the year's work went.",
    },
    {
      kind: "prose",
      text: "**Inbox** collects open pull requests, issues and unread notifications, grouped by repository. Filter to just one kind, or mark the lot as read.",
    },
    {
      kind: "figure",
      media: "github-inbox",
      alt: "The Inbox tab grouped by repository",
      caption: "What is waiting on you.",
    },
    {
      kind: "prose",
      text: "**Releases** lists the newest version from each repository you watch, newest first.",
    },
  ],
  image: [
    {
      kind: "prose",
      text: "Point it at a set of pictures and it crossfades through them on a timer you choose.",
    },
    {
      kind: "figure",
      media: "image-slideshow",
      alt: "The Image widget fading between photos",
      caption: "A slideshow crossfading through a set.",
    },
    {
      kind: "prose",
      text: "One picture works just as well as a set. Either way they are stored in your browser and never uploaded — add them from the widget's own settings, where you also set how long each one stays up.",
    },
  ],
  news: [
    {
      kind: "prose",
      text: "Headlines from Google News, the BBC, The Guardian, the NYT, NPR and Yahoo. Stories open on the publisher's own site — Lux never reposts anyone's article.",
    },
    {
      kind: "figure",
      media: "news-overview",
      alt: "Moving between News sources and the Trending tab",
      caption: "Switching sources, searching, and saving a story for later.",
    },
    {
      kind: "prose",
      text: "**News** gives a tab per publisher you enable, plus **All**, which merges them and folds duplicate coverage of the same story together. A dot marks what is new since your last visit, and the bookmark keeps anything worth coming back to.",
    },
    {
      kind: "figure",
      media: "news-headlines",
      alt: "The News tab with headlines from a single publisher",
      caption: "Headlines from one source.",
    },
    {
      kind: "prose",
      text: "**Trending** is what is being searched right now, straight from Google Trends, for the country you pick.",
    },
    {
      kind: "figure",
      media: "news-trending",
      alt: "The Trending tab showing ranked search topics",
      caption: "What the country is searching.",
    },
    {
      kind: "prose",
      text: "The filter box narrows what is already loaded by headline or publisher; on the Google News tab it searches instead.",
    },
  ],
  note: [
    {
      kind: "prose",
      text: "Somewhere to put the thing you will need in ten minutes. There is no save button because there is nothing to save to — the text stays in this browser.",
    },
    {
      kind: "figure",
      media: "note-writing",
      alt: "Typing into a note as it saves",
      caption: "Typing into a note.",
    },
    {
      kind: "prose",
      text: "The header keeps a running word and character count, with copy and download beside it. Each note widget is its own note, so keep as many as you like — one for the day, one for scratch, one for whatever you keep forgetting.",
    },
  ],
  quickAccess: [
    {
      kind: "prose",
      text: "Three tabs, and everything in them shows as favicon tiles or a plain list — whichever you prefer.",
    },
    {
      kind: "figure",
      media: "quick-access-overview",
      alt: "Moving between the Home, Bookmarks and History tabs",
      caption: "Pinned links and open tabs, your bookmark folders, and where you have been.",
    },
    {
      kind: "prose",
      text: "**Home** holds the links you pinned, plus the tabs you have open right now. Drag a pin to reorder it; hover one to rename or remove it.",
    },
    {
      kind: "figure",
      media: "quick-access-home",
      alt: "The Home tab with pinned links above open tabs",
      caption: "Pins on top, open tabs below.",
    },
    {
      kind: "prose",
      text: "**Bookmarks** is your real bookmark tree, folders and all. Search across the lot, or follow the breadcrumb down into a folder.",
    },
    {
      kind: "prose",
      text: "**History** is recently visited sites, searchable. Anything worth keeping can be pinned to Home from here.",
    },
    {
      kind: "figure",
      media: "quick-access-history",
      alt: "The History tab showing recent sites",
      caption: "Recent sites, with one pinned.",
    },
    {
      kind: "callout",
      title: "Browser lists ask permission first",
      text: "Bookmarks, recently closed tabs, history and most-visited sites each ask for their own permission the first time you use them. Nothing is read until you agree, and you can decline and still use pinned links.",
    },
  ],
  sports: [
    {
      kind: "prose",
      text: "Scores and fixtures across soccer, football, basketball, baseball, hockey, tennis and golf. Pick a league to browse, or star the teams you actually care about and let them collect in one place.",
    },
    {
      kind: "figure",
      media: "sports-overview",
      alt: "Browsing leagues, searching for a team and starring it",
      caption: "Browse by sport, search any team, star it to follow.",
    },
    {
      kind: "prose",
      text: "**Discover** is the whole league, grouped into live, upcoming and final. Teams you follow are starred in place — the rest of the fixtures stay exactly where they are.",
    },
    {
      kind: "figure",
      media: "sports-discover",
      alt: "The Discover tab showing a full league fixture list",
      caption: "A league in full, your teams starred.",
    },
    {
      kind: "prose",
      text: "**Favourites** narrows to only the games your starred teams are in, split by league. A team with nothing on reads as *No game* rather than vanishing.",
    },
    {
      kind: "figure",
      media: "sports-favorites",
      alt: "The Favourites tab grouped by league",
      caption: "The same day, down to your teams.",
    },
    {
      kind: "prose",
      text: "Search reaches every league at once, so typing part of a name finds the club wherever it plays. The date control widens the window a few days either side of today when nothing is on.",
    },
    {
      kind: "prose",
      text: "Opening a game gives the line score, probable starters beforehand and top performers during, plus live detail while it runs — bases, count and outs for baseball.",
    },
  ],
  spotify: [
    {
      kind: "prose",
      text: "The whole transport is here — shuffle, skip, repeat, volume and device switching — alongside the playlist or album the track came from. The backdrop picks up the album art's colour, so the widget shifts with whatever is on.",
    },
    {
      kind: "figure",
      media: "spotify-overview",
      alt: "Searching Spotify from the widget and playing a result",
      caption: "Search reaches your library and Spotify's catalogue; pick a result to play it.",
    },
    {
      kind: "prose",
      text: "The layout follows the widget's height rather than a setting. Give it room and the artwork leads.",
    },
    {
      kind: "figure",
      media: "spotify-player",
      alt: "The Spotify widget at full height, artwork leading",
      caption: "Room to breathe.",
    },
    {
      kind: "prose",
      text: "Flatten it and the same controls fold into a single bar, artwork and all.",
    },
    {
      kind: "figure",
      media: "spotify-mini",
      alt: "The Spotify widget flattened into a compact bar",
      caption: "The same player, short.",
    },
    {
      kind: "prose",
      text: "The queue button in the widget header swaps the player for what is coming next.",
    },
    {
      kind: "callout",
      title: "Controls need Spotify Premium",
      text: "Changing playback — skipping, pausing, switching device — requires a Premium account. That is a restriction in Spotify's own API, not something Lux can work around. Seeing what is playing works either way.",
    },
  ],
  stocks: [
    {
      kind: "prose",
      text: "A watchlist you build yourself, by ticker or by company name.",
    },
    {
      kind: "figure",
      media: "stocks-add-symbol",
      alt: "Searching for a company and adding it to the watchlist",
      caption: "Each match shows which exchange it trades on.",
    },
    {
      kind: "prose",
      text: "Every holding carries its price, the day's move, a sparkline, and the day's range and volume — as a card grid or a plain list, whichever reads better at the size you gave the widget. Drag to reorder, and hover a holding to drop it.",
    },
    {
      kind: "figure",
      media: "stocks-watchlist",
      alt: "The Stocks widget showing a watchlist as a card grid",
      caption: "The watchlist as a card grid.",
    },
    {
      kind: "prose",
      text: "Opening one gives an interactive chart from a day out to five years, with the day's range, the 52-week range and volume. An optional strip above the watchlist carries the S&P 500, Nasdaq and Dow.",
    },
  ],
  tasks: [
    {
      kind: "prose",
      text: "Type to add, tick to complete, drag to reorder.",
    },
    {
      kind: "figure",
      media: "tasks-reorder",
      alt: "Dragging a task into a new position in the list",
      caption: "Drag a row to move it; hover one for edit and delete.",
    },
    {
      kind: "prose",
      text: "Completed items strike through and stay where they are until you clear them. The header keeps a running done and left count, and clears the finished ones in a tap.",
    },
  ],
  weather: [
    {
      kind: "prose",
      text: "Add as many places as you like. Each sits in the list with its temperature and the day's high and low.",
    },
    {
      kind: "figure",
      media: "weather-add-city",
      alt: "Searching for a city and adding it to the list",
      caption: "Searching for a city to add.",
    },
    {
      kind: "prose",
      text: "Opening one gives the full picture — feels-like, humidity, wind, UV, sunrise and sunset, an hourly curve and the next five days.",
    },
    {
      kind: "callout",
      title: "Lux never asks where you are",
      text: "You type a place name and Lux looks up its coordinates once, then remembers them. The extension holds no location permission and never calls the browser's geolocation API.",
    },
  ],
};

const COMMON_TAIL: GuideBlock = {
  kind: "prose",
  text: "Each widget carries a settings control in its own header, outside edit mode. That is where you choose whether it sits on glass or a solid surface, and which accent colour it uses. You can add more than one of the same widget.",
};

const WIDGET_META: Record<string, { title: string; lead: string }> = {
  anilist: { title: "AniList", lead: "Your anime and manga list, across three tabs." },
  calendar: {
    title: "Calendar",
    lead: "Google and Outlook events together, read-only, in two views.",
  },
  email: {
    title: "Mail",
    lead: "Gmail and Outlook inboxes in one list, headers only.",
  },
  github: { title: "GitHub", lead: "Three views of your GitHub activity." },
  image: { title: "Image", lead: "Your own photos, as a single image or a slideshow." },
  news: { title: "News", lead: "Headlines from six publishers, merged or one tab each." },
  note: { title: "Note", lead: "A plain-text scratch note, saved as you type." },
  quickAccess: {
    title: "Quick Access",
    lead: "Links you pin yourself, alongside the lists the browser keeps.",
  },
  sports: { title: "Sports", lead: "Scores for the leagues and teams you follow." },
  spotify: { title: "Spotify", lead: "What is playing, with controls." },
  stocks: { title: "Stocks", lead: "A watchlist with live prices and a chart." },
  tasks: { title: "Tasks", lead: "A to-do list that stays on this machine." },
  weather: { title: "Weather", lead: "Current conditions and forecasts for the places you add." },
};

const WIDGET_ARTICLES: readonly GuideArticle[] = Object.entries(WIDGET_META)
  .map(([id, meta]) => ({
    id,
    title: meta.title,
    lead: meta.lead,
    blocks: [...(WIDGET_BLOCKS[id] ?? []), COMMON_TAIL],
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

export const GUIDE_GROUPS: readonly GuideGroup[] = [
  { id: "getting-started", title: "Getting started", articles: GETTING_STARTED },
  { id: "widgets", title: "Widgets", articles: WIDGET_ARTICLES },
  {
    id: "accounts",
    title: "Accounts & privacy",
    articles: [
      {
        id: "connecting-accounts",
        title: "Connecting an account",
        lead: "Calendar, Spotify, GitHub and AniList can pull in what is yours. Each asks separately, and only when you tell it to.",
        blocks: [
          {
            kind: "prose",
            text: "A widget that needs an account shows a **Connect** button. Press it and you sign in on the provider's own site — your password never touches Lux, and all that comes back is a token.",
          },
          { kind: "heading", text: "What each one is allowed to see" },
          {
            kind: "list",
            items: [
              {
                title: "Google Calendar",
                text: "Read-only access to your calendars, plus your email address so the widget can show which account it is using. It cannot create, move or delete anything.",
              },
              {
                title: "Outlook",
                text: "The same read-only calendar access, through Microsoft.",
              },
              {
                title: "Spotify",
                text: "What is playing, control over it, and your library and playlists so search and the queue work. Controlling playback needs Premium — Spotify's rule for every app, not ours.",
              },
              {
                title: "GitHub",
                text: "Your profile, notifications, and repository access — the broad-sounding one on GitHub's consent screen, which is what lets private contributions count towards your heatmap. Lux only reads with it.",
              },
              {
                title: "AniList",
                text: "Your list, progress and notifications. The only one that writes as well as reads — liking something or bumping an episode count, and only when you do it.",
              },
            ],
          },
          {
            kind: "prose",
            text: "Microsoft and GitHub finish sign-in through a small Lux relay, because those two need a secret that cannot live inside an extension. Google signs in through Chrome, and Spotify and AniList talk to your browser directly. The relay keeps nothing.",
          },
          {
            kind: "prose",
            text: "Tokens expire after an hour or so and Lux renews them in the background, so you should not have to sign in again.",
          },
          {
            kind: "callout",
            title: "What disconnecting actually does",
            text: "Disconnecting deletes the token from this browser, so Lux stops fetching straight away. It does **not** revoke access at the provider — Lux stays listed among your authorised apps until you remove it there too.",
          },
          { kind: "settingsLink", tab: "accounts", label: "Open Accounts & Permissions" },
        ],
      },
    ],
  },
];

export const ARTICLE_ORDER: readonly ArticleLocation[] = GUIDE_GROUPS.flatMap((group) =>
  group.articles.map((article) => ({ group, article })),
);

export function findArticle(id: string): ArticleLocation | undefined {
  return ARTICLE_ORDER.find((entry) => entry.article.id === id);
}

export const FIRST_ARTICLE_ID = ARTICLE_ORDER[0]?.article.id ?? "";
