// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearResourceCaches,
  formatBytes,
  LOCAL_STORAGE_CAP_BYTES,
  measureLocalStorage,
  severityOf,
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

describe("severityOf", () => {
  it("stays calm well below the cap", () => {
    expect(severityOf(LOCAL_STORAGE_CAP_BYTES * 0.5)).toBe("calm");
  });

  it("warns as the cap approaches", () => {
    expect(severityOf(LOCAL_STORAGE_CAP_BYTES * 0.75)).toBe("warning");
  });

  it("escalates near the cap, where eviction starts thrashing", () => {
    expect(severityOf(LOCAL_STORAGE_CAP_BYTES * 0.95)).toBe("danger");
  });
});
