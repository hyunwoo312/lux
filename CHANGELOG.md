# Changelog

All notable changes to Lux are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-07-20

### Added

- New installs open to a starter dashboard — clock, weather, tasks, a note, and quick access — instead of a blank grid.
- The Add-widget picker now describes each widget, flags the recommended ones, and shows a live preview — including account widgets before you sign in.
- News shows image tiles, merges every enabled source into one “All” feed, and adds The Guardian and NPR alongside regional editions (US, UK, Australia, International).
- Filter any news source by topic — World, Business, Technology, Science, or Sports — mute or highlight keywords, and see read and new markers plus a note when several outlets cover the same story.
- Spotify gained an Up Next queue: see what’s coming, add tracks to it from search, and jump ahead to any track.
- The GitHub inbox can act on notifications — mark read, unsubscribe, or mark all read — and surfaces issues assigned to you and where you’re mentioned.
- Stocks now supports crypto and currencies, shows pre- and post-market prices, adds year-to-date, 5-year, and max ranges, and tells you when a closed market reopens.
- The Image widget added a slow pan-and-zoom, per-image captions and focal points, more transition styles, a one-tap “set as dashboard background”, and automatic compression to save space.
- Weather has a scrollable 24-hour forecast, the Tasks widget shows a completion bar, and AniList’s Discover tab is now available while signed in.

### Fixed

- Connecting and refreshing accounts is more reliable across multiple open tabs and after reconnecting — tokens are no longer dropped and accounts no longer get stuck needing a reconnect.
- AniList scores display in your chosen format (100-point, 10-point, 5-star, or 3-smiley) instead of a raw number.
- The GitHub inbox shows when a section fails to load instead of looking empty, and reports GitHub rate limits.
- Stocks recovers from rate limits by failing over to a backup data source, and calendars with very large event counts no longer drop the extras.

## [1.1.2] - 2026-07-07

### Added

- Removing a widget now asks first, with a dialog that says exactly what will be deleted — your saved tickers, tasks, note text, and so on.
- Cleared completed tasks can be brought back — an Undo button sticks around for a few seconds after clearing.
- Hover any widget’s refresh button to see how long ago its data was updated.
- The welcome tour has a new step pointing to where accounts connect, and the Accounts page now says what each connection can access.

### Changed

- Clearer wording wherever it matters: connect buttons say Connect, confirmation buttons say what they confirm, and reset or disconnect messages spell out what’s kept and what’s lost.
- Clearing background or Image-widget photos now asks for confirmation instead of deleting immediately.
- In the calendar’s week view the back-to-month button now sits next to the date range, and any event starting within the hour shows a countdown.

### Fixed

- In the month view, clicking a multi-day event now opens the week with the day you clicked selected, instead of the day the event started.
- GitHub and AniList now say when you’ve hit a rate limit and when to try again, instead of a generic error.
- The Chrome Web Store link in About now opens Lux’s listing instead of the store homepage.
- News headline timestamps now match the style used everywhere else (“2m ago”).

## [1.1.1] - 2026-07-05

### Changed

- New tabs load a little lighter, and dragging or resizing widgets is smoother.

### Fixed

- The clock now ticks over to the new minute right on time, instead of lagging by up to a minute.
- After you switch AniList accounts, your currently-watching list updates to the new account instead of briefly showing the old one.
- Turning a calendar on or off while a sync is already running now takes effect right away, instead of waiting for the next refresh.
- Outlook calendars with a lot of events no longer cut off early — busier months show everything now.
- The refresh button on Weather and Stocks now keeps spinning until every place or symbol has finished updating, instead of stopping after the first.
- With wallpaper or Image-widget rotation set to “sequential,” new tabs now go in order instead of shuffling.
- Tasks set to disappear when completed now clear even if you close the tab right after ticking them off.
- The welcome tour no longer gets stuck if you press the right-arrow key on its last step.

## [1.1.0] - 2026-07-02

### Added

- You can add more than one of any widget now — put two Notes side by side, track weather for several cities, whatever fits how you work.
- New Stocks widget: a watchlist with live prices, the day's change, and an interactive mini-chart.
- New News widget: top headlines from Google News, The New York Times, the BBC, and Yahoo News — switch sources with a tab, or search Google News.
- Weather, Stocks, and Calendar now have a manual refresh button for when you don't want to wait for the next auto-update.

### Changed

- New widgets now fill the row from left to right instead of stacking straight down, and the dashboard scrolls to whatever you just added.
- The toolbar stays pinned at the top now — only the widget area scrolls.
- The add-widget menu got a polish pass: it's alphabetized, hovers smoothly from item to item, previews where a widget will land, and lets you click or drag to add.
- The clock's colon no longer blinks — it was easy to mistake for the UI lagging.

### Fixed

- The Notes widget no longer shows a second, redundant scrollbar.
- Your dashboard no longer resets itself if it runs into a widget type it doesn't recognize — it quietly drops just that one and keeps everything else.

## [1.0.1] - 2026-06-29

### Added

- There's a “What's new” button in the toolbar now — give it a click whenever you want to see what changed.

### Changed

- Keyboard focus is easier to follow, with clearer outlines as you tab through things.

### Fixed

- Spotify and the calendar could spin on “loading” forever if a request stalled or your connection dropped. They let go gracefully now.
- When an account's access expired or got pulled, Lux used to fail without a word. Now it actually asks you to reconnect.
- The GitHub inbox no longer goes blank when just one part of it fails — you'll still get everything that loaded.
- The AniList unread count keeps up properly after you clear your notifications.
- Editing a Quick Access shortcut's URL now refreshes its icon to match.

## [1.0.0] - 2026-06-28

### Added

- 🎉 Lux is officially out! This is the very first public release, so if you're here early — thank you, genuinely.
- Your new tab is a real dashboard now: drag widgets around the grid and resize them to fit how you work.
- Nine widgets to start with: Quick Access, Weather, Calendar, Tasks, Notes, Spotify, GitHub, AniList, and Image.
- Connect Google, Microsoft, or GitHub. Sign-in runs through a tiny relay that holds onto nothing.
- Every widget comes in two finishes, frosted Glass or solid, with full light and dark theming.
- Nothing ever leaves your browser. No account, no analytics, no tracking — your setup stays yours.
- Back up your whole setup to a file, restore it on another machine, or reset and start fresh.
