import { describe, expect, it } from "vitest";
import { createOAuthState } from "@/integrations/oauth";

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
