import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDE_GROUPS } from "../src/guide/content.ts";
import type { GuideBlock } from "../src/guide/types.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guidePath = resolve(root, "GUIDE.md");
const sizesPath = resolve(root, "src", "guide", "mediaSizes.ts");

const HEADER = `# Lux guide

Everything the in-extension guide covers, in one page. Lux shows the same content with screenshots
and navigation built in — open it from the book icon in the toolbar.

This file is generated from \`src/guide/content\`. Edit that, then run \`npm run guide\`.
`;

function webpSize(bytes: Buffer): [number, number] {
  const kind = bytes.toString("ascii", 12, 16);
  if (kind === "VP8X") return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
  if (kind === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (kind === "VP8 ") {
    return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  }
  throw new Error(`Unrecognised WebP chunk "${kind}"`);
}

const mediaSizes = new Map(
  readdirSync(resolve(root, "public", "guide"))
    .filter((file) => file.endsWith(".webp"))
    .map(
      (file) =>
        [
          file.replace(/\.webp$/, ""),
          webpSize(readFileSync(resolve(root, "public", "guide", file))),
        ] as const,
    ),
);
const shippedMedia = new Set(mediaSizes.keys());

const usedMedia = new Set<string>();

function mediaPath(media: string): string {
  usedMedia.add(media);
  if (!shippedMedia.has(media)) {
    process.stderr.write(`No public/guide/${media}.webp for figure "${media}".\n`);
    process.exit(1);
  }
  return `public/guide/${media}.webp`;
}

function renderBlock(block: GuideBlock): string {
  switch (block.kind) {
    case "prose":
      return block.text;
    case "heading":
      return `#### ${block.text}`;
    case "callout":
      return `> **${block.title}**\n>\n> ${block.text}`;
    case "steps":
    case "toolbar":
      return block.steps
        .map((step, index) => `${index + 1}. **${step.title}** — ${step.text}`)
        .join("\n");
    case "list":
      return block.items.map((item) => `- **${item.title}** — ${item.text}`).join("\n");
    case "figure":
      return `<p align="center">\n  <img src="${mediaPath(block.media)}" alt="${block.alt}" width="70%" />\n</p>\n\n_${block.caption}_`;
    case "settingsLink":
      return `_${block.label} — in Settings._`;
    case "link":
      return `[${block.label}](${block.href})`;
  }
}

function renderGuide(): string {
  const contents = GUIDE_GROUPS.map((group) => {
    const links = group.articles
      .map((article) => `  - [${article.title}](#${article.id})`)
      .join("\n");
    return `- **${group.title}**\n${links}`;
  }).join("\n");

  const body = GUIDE_GROUPS.map((group) => {
    const articles = group.articles
      .map((article) =>
        [
          `### ${article.title}`,
          `<a id="${article.id}"></a>`,
          `_${article.lead}_`,
          ...article.blocks.map(renderBlock),
        ].join("\n\n"),
      )
      .join("\n\n");
    return `## ${group.title}\n\n${articles}`;
  }).join("\n\n");

  return `${HEADER}\n${contents}\n\n${body}\n`;
}

function renderSizes(): string {
  const entries = [...mediaSizes.entries()]
    .filter(([name]) => usedMedia.has(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, [width, height]]) => `  "${name}": [${width}, ${height}],`)
    .join("\n");

  return `export const GUIDE_MEDIA_SIZES: Record<string, readonly [number, number]> = {\n${entries}\n};\n`;
}

const expected = renderGuide();
const expectedSizes = renderSizes();

if (process.argv.slice(2).includes("--check")) {
  const stale = [
    readFileSync(guidePath, "utf8") === expected ? null : "GUIDE.md",
    readFileSync(sizesPath, "utf8") === expectedSizes ? null : "src/guide/mediaSizes.ts",
  ].filter((name) => name !== null);

  if (stale.length > 0) {
    process.stderr.write(`${stale.join(" and ")} out of date. Run \`npm run guide\`.\n`);
    process.exit(1);
  }
  process.stderr.write("GUIDE.md and media sizes are up to date.\n");
} else {
  writeFileSync(guidePath, expected, "utf8");
  writeFileSync(sizesPath, expectedSizes, "utf8");
  process.stderr.write("GUIDE.md and media sizes written.\n");
}
