# Changelog

All notable changes to Lux are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2026-08-18

_Lighter background images, a cleaner frosted backdrop, and an AniList sign-in that finishes on its own._

### Changed

#### Dashboard
- The drop preview now takes on the accent color of the widget you’re placing, so it’s easier to see where it will land.

#### Accounts
- Disconnecting an account now asks in the same confirmation dialog used everywhere else, instead of swapping the buttons in the row.

#### Settings
- Background images are converted to WebP when you add them, so a photo takes a fraction of the space and is far less likely to be dropped when browser storage fills up.

### Fixed

#### Dashboard
- Opening the widget menu no longer highlights the first widget before you point at anything.
- The frosted backdrop behind widgets is no longer blocky over a custom background, and it is reused between tabs instead of being blurred again each time.
- A widget whose request stalls now settles into its error state instead of loading forever.

#### Settings
- The permissions list now accounts for every permission Lux holds, including unlimited local storage, instead of leaving one out.
- Help previews the same keyboard shortcuts you can rebind, instead of a fixed pair that could fall behind.

#### AniList
- Signing in no longer leaves the callback tab spinning on “Finishing AniList sign-in” — it closes on its own, even if you moved away from the Lux tab while signing in.

## [1.3.1] - 2026-08-15

_Steadier account refreshes, tidier Sports detail, and a dashboard that copes when browser storage fills up._

### Changed

#### Sports
- Match detail now names its list — probable starters before the game, top performers during it — and shows up to three per team, without repeating a player who leads more than one stat.

### Fixed

#### Dashboard
- Running out of browser storage no longer quietly stops your theme from being remembered — Lux clears its oldest cached widget data to make room, and tells you in Settings if it still can’t save.

#### Accounts
- Two accounts refreshing at the same moment no longer overwrite each other’s sign-in, which could leave one of them asking to be reconnected.

#### GitHub
- A pull request notification now opens the pull request itself, instead of a broken link when the repository or its owner is named “pulls”.

## [1.3.0] - 2026-08-10

_A Sports widget, in-app feedback, and a much deeper AniList, Calendar and Quick Access._

### Added

#### Feedback
- A button now sits beside What’s new in the toolbar. Send a bug, an idea, or anything else straight to the developer — with an optional email if you’d like a reply, and diagnostics only if you choose to include them.

#### AniList
- A new airing view: what’s out today, tomorrow, and across the rest of the week, with countdowns to each episode.
- The Current tab is now a full library — filter by status, jump to your planning backlog, and page through everything as you scroll.
- The Discover tab is browsable and knows what’s already on your list, so you can spot something new without checking twice.

#### Calendar
- Events now carry a one-tap join link for Google Meet, Teams, and other video meetings, so you can get into your 10am without hunting for the invite.
- Shows your RSVP status at a glance and flags the invitations still waiting on an answer.
- Tells you how long you’re free before your next event — handy for knowing whether that’s enough time to start something.

#### GitHub
- A releases tab showing the latest versions from the repositories you watch.

#### Quick Access
- Browse your bookmarks folder by folder instead of only seeing a flat list.

#### Spotify
- Shows the playlist or album the current track is playing from.

#### Sports
- A new widget: live and upcoming scores for the leagues and teams you follow — NFL, NBA, WNBA, MLB, and NHL. Open a game for the line score, game leaders, and detail that keeps up while it’s live. No account needed.

#### Stocks
- Tracks the S&P 500, Nasdaq, and Dow above your watchlist, so you can see the market’s direction alongside your own symbols.

### Changed

#### GitHub
- Now starts at a slightly larger minimum size, so its tabs have room to breathe.

#### Quick Access
- Loads more of your bookmarks, history, and recently closed tabs as you scroll, rather than quietly stopping at the first page.
- The Recently closed list needs one more browser permission than before, so its toggle in Settings will read as off after this update. Chrome withholds the title and address of a closed tab without it, which is why that list used to come up blank. Turn it back on and it will work properly.

### Fixed

#### Accounts
- A failed token refresh no longer signs you out of a connected account. A dropped connection or a slow network is treated as temporary, and your account stays put.

#### GitHub
- Now keeps telling you when part of your inbox failed to load, instead of dropping the warning as soon as the widget reloaded from its cache.

#### Quick Access
- The pin marker now uses the widget’s own accent colour, instead of ignoring it.

#### Spotify
- Search now lets you play to any of your available devices, instead of refusing to work until one was already active — and it shows your results right away rather than waiting on your saved-track state.

## [1.2.1] - 2026-07-31

_Note export, a fuller weather forecast, and a batch of fixes to backups and shortcuts._

### Added

#### GitHub
- The contribution graph shows your best day and your daily average alongside your current and longest streaks.

#### Note
- Copy a note to the clipboard or save it as a text file, straight from the widget’s header.

#### Quick Access
- Open all of your pinned links at once, each in its own tab.

#### Spotify
- Marks the track that’s playing when it’s already saved to your library.

#### Weather
- The hourly forecast now runs 48 hours instead of 24.

### Changed

#### Settings
- Restoring a settings backup now replaces your settings instead of merging them into what’s already there, so a restored dashboard matches the backup exactly. Your connected accounts stay signed in either way.

### Fixed

#### Dashboard
- Lists you’ve expanded with “load more” — like AniList activity — no longer snap back to the first page when they refresh in the background.

#### Settings
- Picking the wrong file when restoring a backup now says what went wrong, instead of showing a raw error message.
- The same keyboard shortcut can no longer be saved into both slots for one action, leaving the second slot wasted.
- The GitHub star count in About no longer goes missing after opening Settings several times.

## [1.2.0] - 2026-07-20

_News and Stocks grew up, the GitHub inbox became actionable, and new installs start with a real dashboard._

### Added

#### Dashboard
- The Add-widget picker now describes each widget, flags the recommended ones, and shows a live preview — including account widgets before you sign in.
- Weather has a scrollable 24-hour forecast, the Tasks widget shows a completion bar, and AniList’s Discover tab is now available while signed in.

#### Onboarding
- New installs open to a starter dashboard — clock, weather, tasks, a note, and quick access — instead of a blank grid.

#### GitHub
- The inbox can act on notifications — mark read, unsubscribe, or mark all read — and surfaces issues assigned to you and where you’re mentioned.

#### Image
- A slow pan-and-zoom, per-image captions and focal points, more transition styles, a one-tap “set as dashboard background”, and automatic compression to save space.

#### News
- Shows image tiles, merges every enabled source into one “All” feed, and adds The Guardian and NPR alongside regional editions (US, UK, Australia, International).
- Filter any news source by topic — World, Business, Technology, Science, or Sports — mute or highlight keywords, and see read and new markers plus a note when several outlets cover the same story.

#### Spotify
- Spotify gained an Up Next queue: see what’s coming, add tracks to it from search, and jump ahead to any track.

#### Stocks
- Now supports crypto and currencies, shows pre- and post-market prices, adds year-to-date, 5-year, and max ranges, and tells you when a closed market reopens.

### Fixed

#### Accounts
- Connecting and refreshing accounts is more reliable across multiple open tabs and after reconnecting — tokens are no longer dropped and accounts no longer get stuck needing a reconnect.

#### AniList
- AniList scores display in your chosen format (100-point, 10-point, 5-star, or 3-smiley) instead of a raw number.

#### GitHub
- The inbox shows when a section fails to load instead of looking empty, and reports GitHub rate limits.

#### Stocks
- Recovers from rate limits by failing over to a backup data source, and calendars with very large event counts no longer drop the extras.

## [1.1.2] - 2026-07-07

_Safer destructive actions, clearer wording throughout, and a calendar that behaves in week view._

### Added

#### Dashboard
- Removing a widget now asks first, with a dialog that says exactly what will be deleted — your saved tickers, tasks, note text, and so on.
- Hover any widget’s refresh button to see how long ago its data was updated.

#### Onboarding
- The welcome tour has a new step pointing to where accounts connect, and the Accounts page now says what each connection can access.

#### Tasks
- Cleared completed tasks can be brought back — an Undo button sticks around for a few seconds after clearing.

### Changed

#### Dashboard
- Clearer wording wherever it matters: connect buttons say Connect, confirmation buttons say what they confirm, and reset or disconnect messages spell out what’s kept and what’s lost.

#### Calendar
- In the calendar’s week view the back-to-month button now sits next to the date range, and any event starting within the hour shows a countdown.

#### Image
- Clearing background or Image-widget photos now asks for confirmation instead of deleting immediately.

### Fixed

#### Dashboard
- GitHub and AniList now say when you’ve hit a rate limit and when to try again, instead of a generic error.

#### Settings
- The Chrome Web Store link in About now opens Lux’s listing instead of the store homepage.

#### Calendar
- In the month view, clicking a multi-day event now opens the week with the day you clicked selected, instead of the day the event started.

#### News
- News headline timestamps now match the style used everywhere else (“2m ago”).

## [1.1.1] - 2026-07-05

_A lighter new tab and a long list of timing and sync fixes._

### Changed

#### Dashboard
- New tabs load a little lighter, and dragging or resizing widgets is smoother.

### Fixed

#### Dashboard
- The refresh button on Weather and Stocks now keeps spinning until every place or symbol has finished updating, instead of stopping after the first.

#### Onboarding
- The welcome tour no longer gets stuck if you press the right-arrow key on its last step.

#### AniList
- After you switch AniList accounts, your currently-watching list updates to the new account instead of briefly showing the old one.

#### Calendar
- Turning a calendar on or off while a sync is already running now takes effect right away, instead of waiting for the next refresh.
- Outlook calendars with a lot of events no longer cut off early — busier months show everything now.

#### Clock
- The clock now ticks over to the new minute right on time, instead of lagging by up to a minute.

#### Image
- With wallpaper or Image-widget rotation set to “sequential,” new tabs now go in order instead of shuffling.

#### Tasks
- Tasks set to disappear when completed now clear even if you close the tab right after ticking them off.

## [1.1.0] - 2026-07-02

_Multiple copies of any widget, plus new Stocks and News widgets._

### Added

#### Dashboard
- You can add more than one of any widget now — put two Notes side by side, track weather for several cities, whatever fits how you work.
- Weather, Stocks, and Calendar now have a manual refresh button for when you don't want to wait for the next auto-update.

#### News
- A new widget: top headlines from Google News, The New York Times, the BBC, and Yahoo News — switch sources with a tab, or search Google News.

#### Stocks
- A new widget: a watchlist with live prices, the day's change, and an interactive mini-chart.

### Changed

#### Dashboard
- New widgets now fill the row from left to right instead of stacking straight down, and the dashboard scrolls to whatever you just added.
- The toolbar stays pinned at the top now — only the widget area scrolls.
- The add-widget menu got a polish pass: it's alphabetized, hovers smoothly from item to item, previews where a widget will land, and lets you click or drag to add.

#### Clock
- The clock's colon no longer blinks — it was easy to mistake for the UI lagging.

### Fixed

#### Dashboard
- Your dashboard no longer resets itself if it runs into a widget type it doesn't recognize — it quietly drops just that one and keeps everything else.

#### Note
- No longer shows a second, redundant scrollbar.

## [1.0.1] - 2026-06-29

_A What’s-new dialog and the first round of reliability fixes._

### Added

#### Dashboard
- There's a “What's new” button in the toolbar now — give it a click whenever you want to see what changed.

### Changed

#### Dashboard
- Keyboard focus is easier to follow, with clearer outlines as you tab through things.

### Fixed

#### Dashboard
- Spotify and the calendar could spin on “loading” forever if a request stalled or your connection dropped. They let go gracefully now.

#### Accounts
- When an account's access expired or got pulled, Lux used to fail without a word. Now it actually asks you to reconnect.

#### AniList
- The AniList unread count keeps up properly after you clear your notifications.

#### GitHub
- The inbox no longer goes blank when just one part of it fails — you'll still get everything that loaded.

#### Quick Access
- Editing a Quick Access shortcut's URL now refreshes its icon to match.

## [1.0.0] - 2026-06-28

_The first public release of Lux._

### Added

#### Dashboard
- 🎉 Lux is officially out! This is the very first public release, so if you're here early — thank you, genuinely.
- Your new tab is a real dashboard now: drag widgets around the grid and resize them to fit how you work.
- Nine widgets to start with: Quick Access, Weather, Calendar, Tasks, Notes, Spotify, GitHub, AniList, and Image.
- Every widget comes in two finishes, frosted Glass or solid, with full light and dark theming.
- Nothing ever leaves your browser. No account, no analytics, no tracking — your setup stays yours.

#### Accounts
- Connect Google, Microsoft, or GitHub. Sign-in runs through a tiny relay that holds onto nothing.

#### Settings
- Back up your whole setup to a file, restore it on another machine, or reset and start fresh.
