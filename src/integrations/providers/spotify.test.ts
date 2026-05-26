import { afterEach, describe, expect, it, vi } from "vitest";
import { spotifyProvider } from "@/integrations/providers/spotify";
import {
  IntegrationReconnectRequiredError,
  IntegrationTemporaryAuthError,
} from "@/integrations/errors";

const params = {
  clientId: "client-123",
  redirectUri: "https://ext.chromiumapp.org/spotify/oauth",
  state: "state-xyz",
  scopes: spotifyProvider.scopes,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("spotifyProvider.buildPkceAuthUrl", () => {
  it("builds an authorization-code PKCE url with the account chooser", () => {
    const url = new URL(spotifyProvider.buildPkceAuthUrl!({ ...params, codeChallenge: "challenge" }));
    expect(url.origin + url.pathname).toBe("https://accounts.spotify.com/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("show_dialog")).toBe("true");
    expect(url.searchParams.get("scope")).toBe(spotifyProvider.scopes.join(" "));
  });
});

describe("spotifyProvider.exchangeCode", () => {
  it("exchanges the code at the token endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: "tok", refresh_token: "ref", expires_in: 3600, token_type: "Bearer" }),
      ),
    );

    const token = await spotifyProvider.exchangeCode!({
      clientId: "client-123",
      code: "code-1",
      redirectUri: params.redirectUri,
      codeVerifier: "verifier",
    });

    expect(token).toMatchObject({ accessToken: "tok", refreshToken: "ref", expiresIn: 3600 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://accounts.spotify.com/api/token",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("spotifyProvider.refreshToken", () => {
  it("keeps the existing refresh token when Spotify does not rotate it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "tok2", expires_in: 3600, token_type: "Bearer" })),
    );

    const token = await spotifyProvider.refreshToken!({ clientId: "client-123", refreshToken: "old-ref" });
    expect(token).toMatchObject({ accessToken: "tok2", refreshToken: "old-ref" });
  });

  it("requires a reconnect when the refresh token is revoked (400/401/403)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 400 }));
    await expect(
      spotifyProvider.refreshToken!({ clientId: "client-123", refreshToken: "old-ref" }),
    ).rejects.toBeInstanceOf(IntegrationReconnectRequiredError);
  });

  it("stays connected on a transient failure (5xx)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      spotifyProvider.refreshToken!({ clientId: "client-123", refreshToken: "old-ref" }),
    ).rejects.toBeInstanceOf(IntegrationTemporaryAuthError);
  });
});
