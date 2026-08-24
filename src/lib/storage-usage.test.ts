// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearResourceCaches,
  formatBytes,
  breakdownOf,
  measureLocalStorage,
  totalOf,
} from "@/lib/storage-usage";

beforeEach(() => {
  localStorage.clear();
});

describe("formatBytes", () => {
  it("keeps small values in bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("switches to kilobytes and then megabytes", () => {
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });

  it("drops the decimal once the number is large enough to not need it", () => {
    expect(formatBytes(1024 * 1024 * 12.4)).toBe("12 MB");
  });

  it("never shows a pointless trailing zero", () => {
    expect(formatBytes(1024 * 1024 * 5)).toBe("5 MB");
  });
});

describe("measureLocalStorage", () => {
  it("counts two bytes per character because localStorage is UTF-16", () => {
    localStorage.setItem("ab", "cd");

    expect(measureLocalStorage().totalBytes).toBe(8);
  });

  it("separates the clearable cache from everything else", () => {
    localStorage.setItem("lux.theme", "dark");
    localStorage.setItem("lux:polled:weather", "x");
    localStorage.setItem("lux:paged:activity", "y");

    const { totalBytes, cacheBytes } = measureLocalStorage();

    expect(cacheBytes).toBe(
      ("lux:polled:weather".length + 1 + "lux:paged:activity".length + 1) * 2,
    );
    expect(totalBytes).toBeGreaterThan(cacheBytes);
  });
});

describe("clearResourceCaches", () => {
  it("drops only the resource caches", () => {
    localStorage.setItem("lux.theme", "dark");
    localStorage.setItem("lux:polled:weather", "x");
    localStorage.setItem("lux:paged:activity", "y");
    localStorage.setItem("lux:widget:note", "my note");

    clearResourceCaches();

    expect(localStorage.getItem("lux.theme")).toBe("dark");
    expect(localStorage.getItem("lux:widget:note")).toBe("my note");
    expect(localStorage.getItem("lux:polled:weather")).toBeNull();
    expect(localStorage.getItem("lux:paged:activity")).toBeNull();
  });
});

describe("breakdownOf", () => {
  const usage = {
    localBytes: 1000,
    localCacheBytes: 400,
    chromeBytes: 200,
    imageBytes: 7 * 1024 * 1024,
    imageCount: 3,
  };

  it("splits local storage into cache and preferences", () => {
    const parts = breakdownOf(usage);

    expect(parts.find((part) => part.label === "Cached data")?.bytes).toBe(400);
    expect(parts.find((part) => part.label === "Preferences")?.bytes).toBe(600);
  });

  it("leaves out a store that holds nothing", () => {
    const parts = breakdownOf({ ...usage, chromeBytes: 0, imageBytes: 0 });

    expect(parts.map((part) => part.label)).toEqual(["Cached data", "Preferences"]);
  });

  it("totals a profile far past the retired 5 MB cap without capping it", () => {
    expect(totalOf(usage)).toBe(1000 + 200 + 7 * 1024 * 1024);
  });

  it("reports nothing rather than dividing by zero on an empty profile", () => {
    expect(
      totalOf({ localBytes: 0, localCacheBytes: 0, chromeBytes: 0, imageBytes: 0, imageCount: 0 }),
    ).toBe(0);
  });
});
