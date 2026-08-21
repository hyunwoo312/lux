/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8");
import { contrastRatio, isInSrgbGamut, parseOklch, type Oklch } from "@/lib/contrast";
import { ACCENT_PRESETS } from "@/widgets/core/accent";

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
    for (const status of ["destructive", "warning", "success", "live", "info"] as const) {
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

  it("every accent preset has a matching block in both themes", () => {
    for (const accent of ACCENT_PRESETS) {
      expect(() => block(`.accent-${accent}`)).not.toThrow();
      expect(() => block(`.dark .accent-${accent}`)).not.toThrow();
    }
  });

  it("no hex colour survives in the token layer", () => {
    const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
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

  it.each(THEMES)("$name page gradient never rises above the raised surface", ({ name, root }) => {
    const raised = token(root, "surface-raised").l;
    const gradient = rawToken(root, "bg-gradient");
    const stops = [...gradient.matchAll(/oklch\(([\d.]+)/g)].map((m) => Number(m[1]));
    expect(stops.length).toBeGreaterThan(0);
    const brightest = Math.max(...stops);
    const darkest = Math.min(...stops);
    if (name === "light") {
      expect(brightest, "page must stay below raised").toBeLessThanOrEqual(raised - 0.02);
    } else {
      expect(brightest, "page must stay below raised").toBeLessThanOrEqual(raised - 0.02);
      expect(darkest).toBeGreaterThan(0);
    }
  });

  it("every custom property referenced in source is defined in the token layer", () => {
    const srcRoot = fileURLToPath(new URL("..", import.meta.url));
    const EXTERNAL = ["--radix-", "--tw-", "--wipe-", "--cell", "--widget-"];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) files.push(full);
      }
    };
    walk(srcRoot);

    const missing = new Set<string>();
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      for (const match of body.matchAll(/var\((--[a-z0-9-]+)/g)) {
        const name = match[1];
        if (!name || EXTERNAL.some((prefix) => name.startsWith(prefix))) continue;
        if (!css.includes(`${name}:`)) missing.add(name);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("every named z-index utility used in source has a matching token", () => {
    const srcRoot = fileURLToPath(new URL("..", import.meta.url));
    const used = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry)) {
          for (const m of readFileSync(full, "utf8").matchAll(/\bz-([a-z][a-z-]*)\b/g)) {
            if (m[1] && m[1] !== "index") used.add(m[1]);
          }
        }
      }
    };
    walk(srcRoot);
    const missing = [...used].filter((name) => !css.includes(`--z-index-${name}:`));
    expect(missing).toEqual([]);
  });
});
