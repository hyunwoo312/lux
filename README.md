<div align="center">
  <img src="public/logo.svg" alt="Lux" width="96" height="96" />
  <h1>Lux</h1>
  <p>A private, customizable new tab dashboard for Chrome and Brave.</p>

  <p>
    <a href="https://chromewebstore.google.com/detail/lux/kmfabjnibncbooljgbkinkfddapmfcna"><img src="https://img.shields.io/badge/Chrome%20Web%20Store-Install-b79ced?style=flat-square&labelColor=2a2533&logo=googlechrome&logoColor=white" alt="Install from the Chrome Web Store" /></a>
    <img src="https://img.shields.io/chrome-web-store/users/kmfabjnibncbooljgbkinkfddapmfcna?style=flat-square&labelColor=2a2533&color=b79ced" alt="Chrome Web Store users" />
    <img src="https://img.shields.io/chrome-web-store/rating/kmfabjnibncbooljgbkinkfddapmfcna?style=flat-square&labelColor=2a2533&color=b79ced" alt="Chrome Web Store rating" />
    <img src="https://img.shields.io/chrome-web-store/stars/kmfabjnibncbooljgbkinkfddapmfcna?style=flat-square&labelColor=2a2533&color=b79ced" alt="Chrome Web Store rating stars" />
    <img src="https://img.shields.io/github/package-json/v/hyunwoo312/lux?style=flat-square&labelColor=2a2533&color=b79ced&label=version" alt="Version" />
  </p>
</div>

<p align="center">
  <img src="public/guide/preview-default.webp" alt="Lux new tab dashboard — default look" width="49%" />
  <img src="public/guide/preview-custom.webp" alt="Lux new tab dashboard — custom wallpaper and layout" width="49%" />
</p>

## What it is

Lux replaces the new tab page with a dashboard — a grid of widgets you arrange yourself, in a
glassy light or dark theme. It runs in your browser, and there's no Lux account to sign up for.

## Install

- **Chrome Web Store** — **[Install Lux](https://chromewebstore.google.com/detail/lux/kmfabjnibncbooljgbkinkfddapmfcna)** (recommended). Works in Chrome and Brave.
- **From source** _(development only)_ — build it yourself and load the unpacked `dist/` folder.
  See [CONTRIBUTING.md](CONTRIBUTING.md#running-it-yourself).

## Features

- **Widgets on a grid.** Drag, drop, and resize them. Each one has a Glass or Solid surface and its
  own accent color.
- **Light and dark.** Both themes are glass-styled, and the accent color is kept for things that
  signal state — selected, live, destructive.
- **Settings and backup.** Options live in one panel, and you can export your whole setup to a file
  and import it again later.
- **Keyboard shortcuts.** Settings, the widget palette, layout editing, grid lines, and the theme
  each have one, and you can rebind them — two bindings per action.

## Using Lux

Everything lives on the new tab. The toolbar has theme, add widget, edit layout, settings, release
notes, the guide, and feedback; the rest of the page is your dashboard.

<p align="center">
  <img src="public/guide/using-add-widget.webp" alt="Opening the add-widget menu and dropping a widget onto the grid" width="100%" />
</p>

Add a widget and click to drop it, hit edit to drag and resize, and open a widget's own header gear
for its surface, accent, and options. Settings holds the theme, wallpaper, and backup.

**[Read the guide →](GUIDE.md)** — the same pages Lux shows in-extension, with a screenshot for
every widget. Open it in Lux from the book icon in the toolbar.

## Widgets

Twelve to choose from, and you can add more than one of the same kind. Most work on their own;
AniList, Calendar, GitHub, and Spotify need you to connect that account first — see
[Connecting accounts](#connecting-accounts).

|                                      |                               |                             |
| ------------------------------------ | ----------------------------- | --------------------------- |
| [AniList](GUIDE.md#anilist)          | [Calendar](GUIDE.md#calendar) | [GitHub](GUIDE.md#github)   |
| [Image](GUIDE.md#image)              | [News](GUIDE.md#news)         | [Note](GUIDE.md#note)       |
| [Quick Access](GUIDE.md#quickAccess) | [Sports](GUIDE.md#sports)     | [Spotify](GUIDE.md#spotify) |
| [Stocks](GUIDE.md#stocks)            | [Tasks](GUIDE.md#tasks)       | [Weather](GUIDE.md#weather) |

## Connecting accounts

Four widgets can connect to an account over OAuth, each only when you start the connection:

- **Google Calendar / Outlook** — read-only calendar events.
- **Spotify** — what's playing, and playback control.
- **GitHub** — contributions and notifications.
- **AniList** — library, progress, and notifications.

Requests go from your browser to the provider, and you can disconnect any of them from settings.

## Privacy

Your dashboard lives on your machine: layout, widget settings, and account tokens are kept in
`chrome.storage.local`. There's no Lux account and no analytics of any kind.

The one server Lux operates is a small stateless relay. It does two jobs — completing sign-in and
refreshing tokens for the providers whose token exchange needs a client secret (Google, Microsoft,
GitHub), and forwarding feedback you write and submit yourself — and it stores nothing. Everything
else talks to the provider directly from your browser.

Full policy: <https://lux.hyunwk.me/privacy>.

## Contributing

Lux is maintained solo and isn't taking pull requests right now, but bug reports are welcome, and
you're free to fork it under Apache 2.0 — keep `LICENSE` and `NOTICE`, and ship under a
different name. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache 2.0](LICENSE) © Hyunwoo Kim
