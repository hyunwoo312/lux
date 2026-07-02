# Changelog

All notable changes to Lux are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
