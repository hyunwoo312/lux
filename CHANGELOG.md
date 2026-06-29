# Changelog

All notable changes to Lux are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
