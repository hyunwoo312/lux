import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { format } from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = resolve(root, "src", "settings", "searchIndex.generated.ts");

type Row = { label: string; section: string; tab: string; description: string };

const TAB_ENTRIES: { tab: string; file: string }[] = [
  { tab: "appearance", file: "src/settings/tabs/AppearanceTab.tsx" },
  { tab: "storage", file: "src/settings/tabs/StorageTab.tsx" },
  { tab: "about", file: "src/settings/tabs/AboutTab.tsx" },
];

function sourceOf(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(resolve(root, file), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

function tagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return tag.getText();
}

function attributes(node: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxAttributes {
  return ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
}

function stringProp(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  name: string,
): string | undefined {
  for (const property of attributes(node).properties) {
    if (!ts.isJsxAttribute(property) || property.name.getText() !== name) continue;
    const value = property.initializer;
    if (value && ts.isStringLiteral(value)) return value.text;
    if (
      value &&
      ts.isJsxExpression(value) &&
      value.expression &&
      ts.isNoSubstitutionTemplateLiteral(value.expression)
    ) {
      return value.expression.text;
    }
  }
  return undefined;
}

function localImports(source: ts.SourceFile): Map<string, string> {
  const found = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith("@/settings/")) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      found.set(element.name.getText(), `src/${specifier.slice("@/".length)}.tsx`);
    }
  }
  return found;
}

async function resolvePrettier(): Promise<Record<string, unknown>> {
  const { resolveConfig } = await import("prettier");
  return (await resolveConfig(outPath)) ?? {};
}

const rows: Row[] = [];
const sections = new Map<string, Row>();
const visited = new Set<string>();

function walkFile(file: string, tab: string, inheritedSection: string): void {
  const key = `${file}::${inheritedSection}`;
  if (visited.has(key)) return;
  visited.add(key);

  let source: ts.SourceFile;
  try {
    source = sourceOf(file);
  } catch {
    return;
  }
  const imports = localImports(source);

  const visit = (node: ts.Node, section: string): void => {
    let nextSection = section;

    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = tagName(node);

      if (name === "SettingsSection") {
        nextSection = stringProp(node, "title") ?? section;
        if (nextSection) {
          sections.set(`${tab}::${nextSection}`, {
            label: nextSection,
            section: nextSection,
            tab,
            description: "",
          });
        }
      } else if (name === "SettingsRow") {
        const label = stringProp(node, "title");
        if (label) {
          rows.push({
            label,
            section: nextSection,
            tab,
            description: stringProp(node, "description") ?? "",
          });
        }
      } else if (imports.has(name)) {
        walkFile(imports.get(name)!, tab, nextSection);
      }
    }

    node.forEachChild((child) => visit(child, nextSection));
  };

  visit(source, inheritedSection);
}

for (const entry of TAB_ENTRIES) walkFile(entry.file, entry.tab, "");

for (const [key, section] of sections) {
  const covered = rows.some((row) => `${row.tab}::${row.section}` === key);
  if (!covered) rows.push(section);
}

rows.sort((a, b) =>
  `${a.tab}${a.section}${a.label}`.localeCompare(`${b.tab}${b.section}${b.label}`),
);

const body = rows
  .map(
    (row) =>
      `  {\n    label: ${JSON.stringify(row.label)},\n    section: ${JSON.stringify(row.section)},\n    tab: ${JSON.stringify(row.tab)},\n    description: ${JSON.stringify(row.description)},\n  },`,
  )
  .join("\n");

const source = `import type { SettingsTab } from "@/settings/tabsMeta";

export type GeneratedSetting = {
  label: string;
  section: string;
  tab: SettingsTab;
  description: string;
};

export const GENERATED_SETTINGS: GeneratedSetting[] = [
${body}
];
`;

const expected = await format(source, { parser: "typescript", ...(await resolvePrettier()) });

if (process.argv.slice(2).includes("--check")) {
  if (readFileSync(outPath, "utf8") !== expected) {
    process.stderr.write(
      "src/settings/searchIndex.generated.ts is out of date. Run `npm run settings-index`.\n",
    );
    process.exit(1);
  }
  process.stderr.write(`Settings index is up to date (${rows.length} entries).\n`);
} else {
  writeFileSync(outPath, expected, "utf8");
  process.stderr.write(`Settings index written (${rows.length} entries).\n`);
}
