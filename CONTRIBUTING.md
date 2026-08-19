# Contributing

Hey — thanks for checking out Lux.

A quick heads-up on how I'm running this one: **Lux is something I build solo**, at least for
now. I'd rather keep the design and direction in one pair of hands while it's still taking
shape, so I'm **not taking pull requests** — if you open one, I'll most likely close it without
merging. Nothing personal; it's just how I want to work on this at the moment.

That said, two things are very welcome:

- **Found a bug? Open an issue.** There's a template to fill in — the more detail (steps, your
  browser and version, what you expected to happen), the easier it is for me to fix. The feedback
  button in the Lux toolbar reaches me too, if you'd rather not use GitHub.
- **Want to build on it? Fork away.** Lux is [Apache-2.0 licensed](LICENSE), so take it and make
  it your own. Two conditions come with that: keep the `LICENSE` and `NOTICE` files, and ship
  under a different name — section 6 of the licence grants no rights to the Lux name or mark.

## Pull requests

I'm not taking pull requests at the moment, so please open an issue first rather than spending
time on a patch I may not be able to merge. If a PR is opened and merged anyway, it is understood
to be contributed under the terms of the [Apache License 2.0](LICENSE), per section 5.

## Security

If you find something security-sensitive, **please don't put it in a public issue.** Email me at
**hyunwoojames@gmail.com** with the details and steps to reproduce, and I'll look into it. For
context on where to look: dashboard data and account tokens live in `chrome.storage.local`, and the
only backend is the stateless token relay. Either way, I want to hear about anything that looks
off.

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

`package.json` is the source of truth for the version; `public/manifest.json` must be updated to
match, and `npm run check` fails until it does.
