import { describe, expect, it } from "vitest";
import { createOAuthState, parseImplicitTokenCallback } from "@/integrations/oauth";

describe("createOAuthState", () => {
  it("returns a url-safe random string", () => {
    const state = createOAuthState();
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(state.length).toBeGreaterThan(0);
  });

  it("returns a different value each call", () => {
    expect(createOAuthState()).not.toBe(createOAuthState());
  });
});

describe("parseImplicitTokenCallback", () => {
  it("parses access token, expiry, state, and type from the hash", () => {
    const url =
      "https://ext.chromiumapp.org/google/oauth#access_token=tok123&expires_in=3600&state=abc&token_type=Bearer";
    expect(parseImplicitTokenCallback(url)).toEqual({
      accessToken: "tok123",
      expiresIn: 3600,
      state: "abc",
      tokenType: "Bearer",
    });
  });

  it("defaults the token type to Bearer when absent", () => {
    const url = "https://ext.chromiumapp.org/google/oauth#access_token=tok&expires_in=10&state=s";
    expect(parseImplicitTokenCallback(url).tokenType).toBe("Bearer");
  });

  it("throws when the callback reports an error", () => {
    const url = "https://ext.chromiumapp.org/google/oauth#error=access_denied&state=s";
    expect(() => parseImplicitTokenCallback(url)).toThrow(/access_denied/);
  });

  it("throws when the access token is missing", () => {
    const url = "https://ext.chromiumapp.org/google/oauth#expires_in=10&state=s";
    expect(() => parseImplicitTokenCallback(url)).toThrow(/missing access token/);
  });
});
