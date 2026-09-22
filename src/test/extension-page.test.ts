// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import indexHtml from "@/../index.html?raw";
import themeInit from "@/../public/theme-init.js?raw";
import { DEFAULT_MODE } from "@/lib/theme";

describe("the new tab page under the MV3 content security policy", () => {
  it("carries no inline script, which extension_pages blocks outright", () => {
    expect(indexHtml).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/i);
  });

  it("loads the pre-paint theme script from its own file", () => {
    expect(indexHtml).toContain('<script src="/theme-init.js"></script>');
  });

  it("keeps that script classic, so it still runs before the first paint", () => {
    expect(indexHtml).not.toMatch(/<script[^>]*theme-init\.js[^>]*type="module"/);
    expect(indexHtml).not.toMatch(/<script[^>]*theme-init\.js[^>]*\s(defer|async)\b/);
  });

  it("keys the pre-paint script off the same storage keys as the app", () => {
    expect(themeInit).toContain('"lux.theme"');
    expect(themeInit).toContain('"lux.accent"');
  });

  it("falls back to the same theme the app would choose", () => {
    expect(themeInit).toContain(`mode = "${DEFAULT_MODE}"`);
  });

  it("still applies the stored theme and accent before React mounts", () => {
    localStorage.setItem("lux.theme", "dark");
    localStorage.setItem("lux.accent", "violet");

    new Function(themeInit)();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("accent-violet")).toBe(true);
  });
});
