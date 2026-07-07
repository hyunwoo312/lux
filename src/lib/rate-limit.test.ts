import { describe, expect, it } from "vitest";
import { loadErrorMessage, RateLimitError, rateLimitError } from "@/lib/rate-limit";

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

describe("rateLimitError", () => {
  const now = Date.parse("2024-01-01T12:00:00Z");

  it("returns null for non-rate-limit failures", () => {
    expect(rateLimitError(response(500), now)).toBeNull();
    expect(rateLimitError(response(404), now)).toBeNull();
    expect(rateLimitError(response(403), now)).toBeNull();
  });

  it("uses retry-after seconds when present", () => {
    const error = rateLimitError(response(429, { "retry-after": "30" }), now);
    expect(error?.message).toBe("Rate limited — try again in 30s.");
  });

  it("uses the ratelimit reset epoch for an exhausted 403", () => {
    const reset = String(Math.round(now / 1000) + 5 * 60);
    const error = rateLimitError(
      response(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": reset }),
      now,
    );
    expect(error?.message).toBe("Rate limited — try again in 5m.");
  });

  it("falls back to a moment when no reset info is exposed", () => {
    const error = rateLimitError(response(429), now);
    expect(error?.message).toBe("Rate limited — try again in a moment.");
  });
});

describe("loadErrorMessage", () => {
  it("prefers the rate-limit message and falls back otherwise", () => {
    expect(loadErrorMessage(new RateLimitError("Rate limited — try again in 2m."), "Couldn’t load.")).toBe(
      "Rate limited — try again in 2m.",
    );
    expect(loadErrorMessage(new Error("boom"), "Couldn’t load.")).toBe("Couldn’t load.");
  });
});
