// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { sweepStaleResourceCaches } from "@/widgets/core/resourceCacheSweep";

const DAY_MS = 24 * 60 * 60 * 1000;

afterEach(() => localStorage.clear());

describe("sweepStaleResourceCaches", () => {
  it("removes stale resource entries and keeps fresh ones", () => {
    const now = 100 * DAY_MS;
    localStorage.setItem("lux:polled:stocks:AAPL:1d", JSON.stringify({ at: now - 8 * DAY_MS }));
    localStorage.setItem("lux:paged:news:https://example.com", JSON.stringify({ at: now - DAY_MS }));

    sweepStaleResourceCaches(now, 7 * DAY_MS);

    expect(localStorage.getItem("lux:polled:stocks:AAPL:1d")).toBeNull();
    expect(localStorage.getItem("lux:paged:news:https://example.com")).not.toBeNull();
  });

  it("removes corrupt resource entries", () => {
    localStorage.setItem("lux:polled:weather:x", "{ not json");

    sweepStaleResourceCaches(1000);

    expect(localStorage.getItem("lux:polled:weather:x")).toBeNull();
  });

  it("leaves keys outside the resource prefixes untouched", () => {
    localStorage.setItem("widget:anilist", JSON.stringify({ at: 0 }));
    localStorage.setItem("unrelated", "value");

    sweepStaleResourceCaches(100 * DAY_MS, 7 * DAY_MS);

    expect(localStorage.getItem("widget:anilist")).not.toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("value");
  });
});
