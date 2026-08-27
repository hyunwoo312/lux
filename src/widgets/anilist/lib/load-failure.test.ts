// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { classifyLoadError, HttpError, RateLimitError } from "@/lib/net";

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
