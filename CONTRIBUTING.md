# Contributing

Hey — thanks for checking out Lux.

A quick heads-up on how I'm running this one: **Lux is something I build solo**, at least for
now. I'd rather keep the design and direction in one pair of hands while it's still taking
shape, so I'm **not taking pull requests** — if you open one, I'll most likely close it without
merging. Nothing personal; it's just how I want to work on this at the moment.

That said, two things are very welcome:

- **Found a bug? Open an issue.** There's a template to fill in — the more detail (steps, your
  browser and version, what you expected to happen), the easier it is for me to fix.
- **Want to build on it? Fork away.** Lux is [MIT-licensed](LICENSE), so take it and make it
  your own.

## Security

If you find something security-sensitive, **please don't put it in a public issue.** Email me at
**hyunwoojames@gmail.com** with the details and steps to reproduce, and I'll look into it. For
context: Lux is local-first — your dashboard data and account tokens live in
`chrome.storage.local`, and the only backend is a stateless token relay that stores nothing —
but I still want to hear about anything that looks off.

## Running it yourself

Want to try Lux from source or poke at the code? You'll need **Node.js 22+**.

```bash
npm install
npm run dev      # preview the new tab page in a normal browser tab
npm run build    # production build into dist/
```

To load your build as a real extension and try it for real:

1. `npm run build`
2. Open `chrome://extensions` (or `brave://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and select the generated `dist/` folder.

Before anything ships, `npm run check` (lint + typecheck + tests + build) has to pass.

Under the hood: React 19 + TypeScript, Tailwind CSS v4, shadcn/Radix, Zustand, and Vite,
packaged as a Manifest V3 extension.

## Versioning

Lux follows [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`:

- **MAJOR** — breaking changes or storage migrations
- **MINOR** — a new widget or feature
- **PATCH** — fixes and polish

`package.json` is the source of truth for the version; the manifest version is synced from it at
build time.
