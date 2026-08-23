// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { HttpError, RateLimitError } from "@/lib/net";
import { classifyLoadError } from "@/lib/net";
import { loadFailureMessage } from "@/widgets/anilist/lib/load-failure";

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, "onLine", { value, configurable: true });

afterEach(() => setOnline(true));

function timeoutError(): Error {
  const error = new Error("The request timed out");
  error.name = "TimeoutError";
  return error;
}

describe("classifyLoadError", () => {
  it("blames the connection when the browser reports being offline", () => {
    setOnline(false);
    expect(classifyLoadError(new HttpError(500, "boom"))).toBe("offline");
  });

  it("recognises a rate limit", () => {
    expect(classifyLoadError(new RateLimitError(30_000))).toBe("rateLimited");
  });

  it("treats a server error as AniList being unreachable", () => {
    expect(classifyLoadError(new HttpError(503, "boom"))).toBe("unreachable");
  });

  it("treats a rejected token as an auth failure", () => {
    expect(classifyLoadError(new HttpError(401, "nope"))).toBe("auth");
    expect(classifyLoadError(new HttpError(403, "nope"))).toBe("auth");
  });

  it("treats an unexpected client-side status as other", () => {
    expect(classifyLoadError(new HttpError(422, "nope"))).toBe("other");
  });

  it("treats a failed fetch as AniList being unreachable", () => {
    expect(classifyLoadError(new TypeError("Failed to fetch"))).toBe("unreachable");
  });

  it("treats a timeout as AniList being unreachable", () => {
    expect(classifyLoadError(timeoutError())).toBe("unreachable");
  });

  it("does not blame AniList when our own parser rejects the payload", () => {
    expect(classifyLoadError(new Error("Unexpected AniList list response"))).toBe("other");
  });
});

describe("loadFailureMessage", () => {
  it("passes a rate-limit message through so the wait is visible", () => {
    expect(loadFailureMessage(new RateLimitError(30_000), "your feed")).toBe(
      "Rate limited — try again in 30s.",
    );
  });

  it("says the user is offline without naming what failed", () => {
    setOnline(false);
    expect(loadFailureMessage(new Error("boom"), "your feed")).toBe(
      "You’re offline. Reconnect to see the latest.",
    );
  });

  it("names AniList and clears the user of blame when the service is down", () => {
    const message = loadFailureMessage(new HttpError(502, "boom"), "your inbox");
    expect(message).toContain("AniList isn’t responding");
    expect(message).toContain("your inbox");
    expect(message).toContain("their end");
  });

  it("falls back to naming what could not load", () => {
    expect(loadFailureMessage(new Error("Unexpected AniList list response"), "your list")).toBe(
      "Couldn’t load your list.",
    );
  });

  it("tells a rejected account to reconnect rather than blaming the load", () => {
    const message = loadFailureMessage(new HttpError(401, "nope"), "your list");
    expect(message).toContain("Reconnect your account");
    expect(message).not.toContain("Couldn’t load");
  });
});
