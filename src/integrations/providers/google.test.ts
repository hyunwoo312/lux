import { afterEach, describe, expect, it, vi } from "vitest";
import { googleProvider } from "@/integrations/providers/google";

afterEach(() => {
  vi.restoreAllMocks();
});

const baseParams = {
  clientId: "client-123",
  redirectUri: "https://ext.chromiumapp.org/google/oauth",
  state: "state-xyz",
  codeChallenge: "challenge",
  scopes: googleProvider.scopes,
};

describe("googleProvider.buildPkceAuthUrl", () => {
  it("builds an authorization-code PKCE url that requests offline access", () => {
    const url = new URL(googleProvider.buildPkceAuthUrl!({ ...baseParams }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });

  it("supports refresh through the relay", () => {
    expect(typeof googleProvider.refreshToken).toBe("function");
  });

  it("falls back to a non-storm expiry when the relay omits expires_in", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "tok", token_type: "Bearer" })),
    );
    const token = await googleProvider.refreshToken!({ clientId: "c", refreshToken: "r" });
    expect(token.expiresIn).toBeGreaterThan(300);
  });
});
