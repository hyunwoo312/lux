import { describe, expect, it } from "vitest";
import { buildDiagnostics, parseBrowser, parseOs } from "@/feedback/lib/diagnostics";

const CHROME_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const EDGE_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0";

describe("parseBrowser", () => {
  it("names Chrome with its major version", () => {
    expect(parseBrowser(CHROME_WIN, false)).toBe("Chrome 151");
  });

  it("distinguishes Brave, which is otherwise indistinguishable from Chrome", () => {
    expect(parseBrowser(CHROME_WIN, true)).toBe("Brave 151");
  });

  it("prefers the more specific Edge marker over the Chrome one it also sends", () => {
    expect(parseBrowser(EDGE_MAC, false)).toBe("Edge 151");
  });

  it("says Unknown rather than guessing at an unrecognised agent", () => {
    expect(parseBrowser("Mozilla/5.0 (curl)", false)).toBe("Unknown");
  });
});

describe("parseOs", () => {
  it("recognises the platforms Lux supports", () => {
    expect(parseOs(CHROME_WIN)).toBe("Windows");
    expect(parseOs(EDGE_MAC)).toBe("macOS");
    expect(parseOs("X11; CrOS x86_64 14541.0.0")).toBe("ChromeOS");
    expect(parseOs("X11; Linux x86_64")).toBe("Linux");
  });

  it("says Unknown rather than guessing", () => {
    expect(parseOs("something else entirely")).toBe("Unknown");
  });
});

describe("buildDiagnostics", () => {
  const base = {
    version: "1.3.0",
    userAgent: CHROME_WIN,
    isBrave: false,
    widgetTypes: ["sports", "calendar", "sports"],
    connectedProviders: ["spotify", "google", "spotify"],
  };

  it("reports widget types and provider names, deduped and ordered", () => {
    const result = buildDiagnostics(base);

    expect(result.widgets).toEqual(["calendar", "sports"]);
    expect(result.providers).toEqual(["google", "spotify"]);
  });

  it("carries only the five declared fields, so nothing can leak in by accident", () => {
    expect(Object.keys(buildDiagnostics(base)).sort()).toEqual([
      "browser",
      "os",
      "providers",
      "version",
      "widgets",
    ]);
  });

  it("stays empty when the dashboard is bare and no account is connected", () => {
    const result = buildDiagnostics({ ...base, widgetTypes: [], connectedProviders: [] });

    expect(result.widgets).toEqual([]);
    expect(result.providers).toEqual([]);
  });
});
