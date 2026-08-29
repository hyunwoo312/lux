/// <reference types="node" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8");
import {
  compositeOver,
  contrastOfRgb,
  contrastRatio,
  isInSrgbGamut,
  mixOklch,
  parseOklch,
  toLinearRgb,
  type Oklch,
} from "@/styles/contrast";
import { ACCENT_PRESETS } from "@/widgets/core/accent";
import { cn } from "@/lib/utils";
import { TYPE_SCALE } from "@/lib/type";
import { sourceFiles, sourcePath } from "@/test/source-files";

const AA_TEXT = 4.5;
const AA_UI = 3;

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (!match?.[1]) throw new Error(`No CSS block for ${selector}`);
  return match[1];
}

function rawToken(selector: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(block(selector));
  if (!match?.[1]) throw new Error(`No --${name} in ${selector}`);
  return match[1].trim();
}

function token(selector: string, name: string, depth = 0): Oklch {
  const raw = rawToken(selector, name);
  const indirect = /^var\(--([a-z0-9-]+)\)$/.exec(raw);
  if (indirect?.[1]) {
    if (depth > 3) throw new Error(`--${name} in ${selector} indirects too deeply`);
    return token(selector, indirect[1], depth + 1);
  }
  const color = parseOklch(raw);
  if (!color) throw new Error(`--${name} in ${selector} is not plain oklch: ${raw}`);
  return color;
}

const SURFACES = {
  light: { card: token(":root", "card"), background: token(":root", "background") },
  dark: { card: token(".dark", "card"), background: token(".dark", "background") },
} as const;

const THEMES = [
  { name: "light", root: ":root", prefix: "" },
  { name: "dark", root: ".dark", prefix: ".dark " },
] as const;

describe("colour tokens", () => {
  it.each(THEMES)("$name ink ladder stays legible on card and background", ({ name, root }) => {
    const surfaces = SURFACES[name];
    for (const rung of ["ink", "ink-2", "ink-3", "ink-4"] as const) {
      const ink = token(root, rung);
      expect(contrastRatio(ink, surfaces.card)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(ink, surfaces.background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(THEMES)("$name status ramp is legible and in gamut", ({ name, root }) => {
    const surfaces = SURFACES[name];
    for (const status of ["destructive", "warning", "success", "info"] as const) {
      const color = token(root, status);
      const paired = token(root, `${status}-foreground`);
      expect(isInSrgbGamut(color), `${name} --${status} out of sRGB gamut`).toBe(true);
      expect(contrastRatio(color, surfaces.card)).toBeGreaterThanOrEqual(AA_UI);
      expect(contrastRatio(color, paired)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(THEMES)("$name accent presets pass AA as ink and as a fill", ({ name, prefix }) => {
    const surfaces = SURFACES[name];
    for (const accent of ACCENT_PRESETS) {
      const selector = `${prefix}.accent-${accent}`;
      const primary = token(selector, "primary");
      const paired = token(selector, "primary-foreground");
      expect(isInSrgbGamut(primary), `${selector} --primary out of sRGB gamut`).toBe(true);
      expect(
        contrastRatio(primary, surfaces.card),
        `${selector} --primary on card`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
      expect(
        contrastRatio(primary, paired),
        `${selector} fill vs its foreground`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(THEMES)("$name accent reads as an icon on the active-nav tint", ({ name, prefix }) => {
    const surface = token(name === "light" ? ":root" : ".dark", "surface-overlay");
    for (const accent of ACCENT_PRESETS) {
      const primary = token(`${prefix}.accent-${accent}`, "primary");
      const tint = {
        l: primary.l * 0.12 + surface.l * 0.88,
        c: primary.c * 0.12 + surface.c * 0.88,
        h: primary.h,
      };
      expect(contrastRatio(primary, tint)).toBeGreaterThanOrEqual(AA_UI);
    }
  });

  it("the contribution heatmap ramp is perceptible at every step in both themes", () => {
    const ALPHAS = [0.36, 0.6, 0.82];
    const MIN_STEP = 1.35;
    const MIN_RAMP = 6.5;

    for (const theme of THEMES) {
      const surface = SURFACES[theme.name].card;
      const foreground = token(theme.root, "foreground");
      const primary = token(`${theme.prefix}.accent-violet`, "primary");
      const bg = toLinearRgb(surface);

      const levels = [
        compositeOver(toLinearRgb(foreground), 0.08, bg),
        ...ALPHAS.map((alpha) => compositeOver(toLinearRgb(primary), alpha, bg)),
        toLinearRgb(mixOklch(primary, foreground, 0.62)),
      ];

      for (let index = 0; index < levels.length - 1; index += 1) {
        const step = contrastOfRgb(levels[index]!, levels[index + 1]!);
        expect(step, `${theme.name} heat-${index} to heat-${index + 1}`).toBeGreaterThan(MIN_STEP);
      }
      expect(contrastOfRgb(levels[0]!, levels[4]!), `${theme.name} full ramp`).toBeGreaterThan(
        MIN_RAMP,
      );
    }
  });

  it("the radius scale is monotonic and every rung is perceptibly distinct", () => {
    const scale = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
    const px = scale.map((name) => {
      const raw = rawToken("@theme inline", `radius-${name}`);
      const rem = raw.startsWith("var(") ? rawToken(":root", "radius") : raw;
      return Number.parseFloat(rem) * 16;
    });
    for (let i = 1; i < px.length; i += 1) {
      const previous = px[i - 1]!;
      const current = px[i]!;
      expect(current).toBeGreaterThan(previous);
      expect(current - previous).toBeGreaterThanOrEqual(2);
    }
  });

  it("no hex colour survives in the token layer", () => {
    const withoutMasks = css.replace(/mask-image:[^;]+;/g, "");
    const hexes = withoutMasks.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexes).toEqual([]);
  });

  it.each(THEMES)(
    "$name surface ladder rises monotonically with a perceptible step",
    ({ root }) => {
      const rungs = ["surface-page", "surface-raised", "surface-overlay", "surface-modal"] as const;
      const lightness = rungs.map((rung) => token(root, rung).l);
      for (let i = 1; i < lightness.length; i += 1) {
        const step = Math.abs((lightness[i] ?? 0) - (lightness[i - 1] ?? 0));
        expect(step, `${rungs[i - 1]} -> ${rungs[i]}`).toBeGreaterThanOrEqual(0.005);
      }
    },
  );

  it.each(THEMES)("$name page gradient never rises above the raised surface", ({ root }) => {
    const raised = token(root, "surface-raised").l;
    const gradient = rawToken(root, "bg-gradient");
    const stops = [...gradient.matchAll(/oklch\(([\d.]+)/g)].map((m) => Number(m[1]));
    expect(stops.length).toBeGreaterThan(0);
    expect(Math.max(...stops), "page must stay below raised").toBeLessThanOrEqual(raised - 0.02);
  });

  it("every custom property referenced in source is defined in the token layer", () => {
    const EXTERNAL = ["--radix-", "--tw-", "--wipe-", "--widget-"];
    const missing = new Set<string>();
    for (const file of sourceFiles()) {
      const body = readFileSync(file, "utf8");
      for (const match of body.matchAll(/var\((--[a-z0-9-]+)/g)) {
        const name = match[1];
        if (!name || EXTERNAL.some((prefix) => name.startsWith(prefix))) continue;
        if (!css.includes(`${name}:`)) missing.add(name);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("keeps no colour or shadow token nothing references", () => {
    const bodies = sourceFiles()
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const exported = [...css.matchAll(/--(?:color|shadow)-([a-z0-9-]+):/g)].map(
      (m) => m[1] as string,
    );
    const unused = exported.filter(
      (name) => !new RegExp(`\\b[a-z][a-z-]*-${name}(?![\\w-])`).test(bodies),
    );
    expect(unused).toEqual([]);
  });

  describe("the ink ladder inside widgets", () => {
    const HAIRLINE = /\b(?:stroke|border|ring|outline|divide)-ink(?:-[0-9])?(?![\w-])/g;
    const ANCHOR = /\b(?:stroke|bg|ring-offset)-background\b/;
    const ANCHOR_REACH_LINES = 12;

    type Mark = { at: string; lines: string[]; index: number };

    const widgetSources = sourceFiles()
      .filter((file) => sourcePath(file).startsWith("widgets"))
      .map((file) => ({ path: sourcePath(file), lines: readFileSync(file, "utf8").split("\n") }));

    function marks(pattern: RegExp): Mark[] {
      return widgetSources.flatMap(({ path, lines }) =>
        lines.flatMap((line, index) =>
          [...line.matchAll(pattern)].map((match) => ({
            at: `${path}:${index + 1}: ${match[0]}`,
            lines,
            index,
          })),
        ),
      );
    }

    function isAnchored({ lines, index }: Mark): boolean {
      const beneath = lines.slice(Math.max(0, index - ANCHOR_REACH_LINES), index + 1);
      return ANCHOR.test(beneath.join("\n"));
    }

    it("bans the faintest rung on fills, strokes and borders, not only on text", () => {
      expect(marks(/[a-z][a-z-]*-ink-4(?![\w-])/g).map((mark) => mark.at)).toEqual([]);
    });

    it("never thins a rung with an opacity modifier, which lands below the banned rung", () => {
      expect(marks(/[a-z][a-z-]*-ink(?:-[0-9])?\/\d+/g).map((mark) => mark.at)).toEqual([]);
    });

    it("anchors a hairline drawn with a line property, whose rung cannot carry it alone", () => {
      const unanchored = marks(HAIRLINE)
        .filter((mark) => !isAnchored(mark))
        .map((mark) => mark.at);
      expect(unanchored).toEqual([]);
    });
  });

  describe("z-index", () => {
    const LOCAL_STACKING_MAX = 30;
    const tokens = [...css.matchAll(/--z-index-([a-z-]+):/g)].map((m) => m[1] as string);
    const sources = sourceFiles().map((file) => ({ file, body: readFileSync(file, "utf8") }));
    const used = new Set(
      sources.flatMap(({ body }) =>
        [...body.matchAll(/\bz-([a-z][a-z-]*)\b/g)]
          .map((m) => m[1] as string)
          .filter((name) => name !== "index"),
      ),
    );

    it("names every layer it uses", () => {
      expect([...used].filter((name) => !tokens.includes(name))).toEqual([]);
    });

    it("keeps no token nothing references", () => {
      expect(tokens.filter((name) => !used.has(name))).toEqual([]);
    });

    it("reserves raw numbers for stacking inside a component", () => {
      const offenders = sources.flatMap(({ file, body }) =>
        [...body.matchAll(/\B(-?)z-\[?(\d+)\]?\b/g)]
          .filter((m) => m[1] === "-" || Number(m[2]) > LOCAL_STACKING_MAX)
          .map((m) => `${sourcePath(file)}: ${m[0]}`),
      );
      expect(offenders).toEqual([]);
    });
  });

  it("focus is expressed only through the shared utility", () => {
    const offenders = sourceFiles().flatMap((file) =>
      [
        ...readFileSync(file, "utf8").matchAll(
          /\bfocus-visible:(?:ring|outline|border)-[^\s"'`,)]*/g,
        ),
      ].map((m) => `${sourcePath(file)}: ${m[0]}`),
    );
    expect(offenders).toEqual([]);
  });

  it("tailwind-merge knows every font-size in the type scale", () => {
    const declared = new Set<string>();
    for (const m of css.matchAll(/--text-([a-z-]+):/g)) {
      const name = m[1];
      if (name && !name.endsWith("--line-height")) declared.add(name);
    }
    expect([...declared].sort()).toEqual([...TYPE_SCALE].sort());
  });

  it("a type recipe keeps both its size and its ink", () => {
    expect(cn("text-caption", "text-ink-3")).toBe("text-caption text-ink-3");
    expect(cn("text-body text-ink-2")).toBe("text-body text-ink-2");
    expect(cn("text-body", "text-caption")).toBe("text-caption");
    expect(cn("text-ink-3", "text-ink")).toBe("text-ink");
  });

  it("the focus utility resolves a gap colour in both themes", () => {
    expect(css).toContain("@utility focus-ring");
    for (const { root } of THEMES) {
      expect(rawToken(root, "focus-gap")).toMatch(/^oklch\(/);
    }
  });
});
