// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { isOnline, subscribeOnline } from "@/lib/net";

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, "onLine", { value, configurable: true });

afterEach(() => setOnline(true));

describe("isOnline", () => {
  it("reports offline only when the browser says so", () => {
    setOnline(false);
    expect(isOnline()).toBe(false);
    setOnline(true);
    expect(isOnline()).toBe(true);
  });
});

describe("subscribeOnline", () => {
  it("reports both transitions and stops after unsubscribe", () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeOnline((online) => seen.push(online));

    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    expect(seen).toEqual([false, true]);

    unsubscribe();
    window.dispatchEvent(new Event("offline"));
    expect(seen).toEqual([false, true]);
  });
});
