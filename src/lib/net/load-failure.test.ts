// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { classifyLoadError, describeFailure, HttpError, RateLimitError } from "@/lib/net";

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

  it("treats a server error as the service being unreachable", () => {
    expect(classifyLoadError(new HttpError(503, "boom"))).toBe("unreachable");
  });

  it("treats a rejected token as an auth failure", () => {
    expect(classifyLoadError(new HttpError(401, "nope"))).toBe("auth");
    expect(classifyLoadError(new HttpError(403, "nope"))).toBe("auth");
  });

  it("treats an unexpected client-side status as other", () => {
    expect(classifyLoadError(new HttpError(422, "nope"))).toBe("other");
  });

  it("treats a failed fetch as the service being unreachable", () => {
    expect(classifyLoadError(new TypeError("Failed to fetch"))).toBe("unreachable");
  });

  it("treats a timeout as the service being unreachable", () => {
    expect(classifyLoadError(timeoutError())).toBe("unreachable");
  });

  it("does not blame the service when our own parser rejects the payload", () => {
    expect(classifyLoadError(new Error("Unexpected AniList list response"))).toBe("other");
  });
});

describe("describeFailure", () => {
  const anilist = { service: "AniList", subject: "trending titles" } as const;

  it("blames the connection rather than the service when offline", () => {
    setOnline(false);
    const { message, tone } = describeFailure(new HttpError(500, "boom"), anilist);
    expect(message).toBe("You’re offline — this will load when your connection is back.");
    expect(tone).toBe("neutral");
  });

  it("names the service and the subject when it is unreachable", () => {
    expect(describeFailure(new HttpError(503, "boom"), anilist).message).toBe(
      "AniList isn’t responding, so trending titles couldn’t load. Try again shortly.",
    );
  });

  it("points a rejected token at Settings and warns rather than errors", () => {
    const { message, tone } = describeFailure(new HttpError(401, "nope"), anilist);
    expect(message).toBe("AniList turned down the request. Reconnect your account in Settings.");
    expect(tone).toBe("warning");
  });

  it("surfaces the rate-limit wait", () => {
    expect(describeFailure(new RateLimitError(120_000), anilist).message).toBe(
      "Rate limited — try again in 2m.",
    );
  });

  it("falls back to the subject for anything else, including a non-Error", () => {
    expect(describeFailure(new HttpError(422, "nope"), anilist).message).toBe(
      "Couldn’t load trending titles.",
    );
    expect(describeFailure("not an error", anilist).message).toBe("Couldn’t load trending titles.");
  });

  it("drops the service name in the short register, where context supplies it", () => {
    expect(
      describeFailure(new HttpError(503, "boom"), {
        service: "Outlook",
        subject: "messages",
        register: "short",
      }).message,
    ).toBe("Not responding — retrying shortly.");
  });
});
