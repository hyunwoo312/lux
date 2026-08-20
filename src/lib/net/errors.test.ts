import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  InvalidResponseError,
  loadErrorMessage,
  parseResponse,
  RateLimitError,
  retryAfterMs,
  ensureOk,
  HttpError,
} from "@/lib/net";
import { rateLimitError } from "@/lib/net/errors";

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
    expect(loadErrorMessage(new RateLimitError(120_000), "Couldn’t load.")).toBe(
      "Rate limited — try again in 2m.",
    );
    expect(loadErrorMessage(new Error("boom"), "Couldn’t load.")).toBe("Couldn’t load.");
  });
});

describe("retryAfterMs", () => {
  const now = Date.parse("2024-01-01T12:00:00Z");

  it("reads the retry-after header in seconds", () => {
    expect(retryAfterMs(response(429, { "retry-after": "30" }), now)).toBe(30_000);
  });

  it("falls back to x-ratelimit-reset as an epoch", () => {
    const reset = String(Math.floor(now / 1000) + 120);
    expect(retryAfterMs(response(429, { "x-ratelimit-reset": reset }), now)).toBe(120_000);
  });

  it("returns 0 when neither header is present", () => {
    expect(retryAfterMs(response(429), now)).toBe(0);
  });

  it("survives onto the error the helper builds", () => {
    const error = rateLimitError(response(429, { "retry-after": "45" }), now);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error?.retryAfterMs).toBe(45_000);
  });
});

describe("parseResponse", () => {
  const schema = z.object({ items: z.array(z.unknown()).optional() });

  it("returns the parsed payload when the shape matches", () => {
    expect(parseResponse("test", schema, { items: [1, 2] })).toEqual({ items: [1, 2] });
  });

  it("throws InvalidResponseError carrying the zod issues", () => {
    try {
      parseResponse("test", schema, { items: "not-an-array" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidResponseError);
      expect((error as InvalidResponseError).issues.length).toBeGreaterThan(0);
      expect((error as InvalidResponseError).message).toBe("Unexpected test response");
    }
  });
});

describe("ensureOk", () => {
  it("passes a successful response through", () => {
    expect(() => ensureOk(response(200), "nope")).not.toThrow();
  });

  it("throws HttpError carrying the status and the caller's message", () => {
    try {
      ensureOk(response(503), "Weather request failed");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(503);
      expect((error as HttpError).message).toBe("Weather request failed");
    }
  });

  it("prefers a rate-limit error so the poller can honour the wait", () => {
    try {
      ensureOk(response(429, { "retry-after": "30" }), "GitHub request failed");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfterMs).toBe(30_000);
    }
  });
});
