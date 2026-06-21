import { afterEach, describe, expect, it, vi } from "vitest";
import { createRelayProvider } from "@/integrations/providers/relay-provider";
import {
  IntegrationReconnectRequiredError,
  IntegrationTemporaryAuthError,
} from "@/integrations/errors";

const provider = createRelayProvider({
  id: "google",
  label: "Test Provider",
  scopes: ["scope-a", "scope-b"],
  authorizationEndpoint: "https://auth.example.com/authorize",
  authParams: { access_type: "offline" },
  supportsRefresh: true,
  fetchProfile: async () => ({ providerAccountId: "1", displayName: "Test" }),
});

const exchangeParams = {
  clientId: "client-1",
  code: "code-1",
  redirectUri: "https://ext.chromiumapp.org/google/oauth",
  codeVerifier: "verifier-1",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createRelayProvider.buildPkceAuthUrl", () => {
  it("builds an authorization-code PKCE url and forwards extra auth params", () => {
    const url = new URL(
      provider.buildPkceAuthUrl!({
        clientId: "client-1",
        redirectUri: exchangeParams.redirectUri,
        state: "state-1",
        codeChallenge: "challenge-1",
        scopes: provider.scopes,
      }),
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-1");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("access_type")).toBe("offline");
  });
});

describe("createRelayProvider.exchangeCode", () => {
  it("posts an authorization_code grant to the provider relay endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "tok",
          refresh_token: "ref",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "scope-a scope-b",
        }),
      ),
    );

    const token = await provider.exchangeCode!(exchangeParams);

    expect(token).toMatchObject({ accessToken: "tok", refreshToken: "ref", expiresIn: 3600 });
    expect(token.scopes).toEqual(["scope-a", "scope-b"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://lux.hyunwk.me/google/token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: "code-1",
          redirect_uri: exchangeParams.redirectUri,
          code_verifier: "verifier-1",
        }),
      }),
    );
  });

  it("throws when the relay returns no access token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "exchange_failed" }), { status: 400 }),
    );
    await expect(provider.exchangeCode!(exchangeParams)).rejects.toThrow();
  });
});

describe("createRelayProvider.refreshToken", () => {
  it("rotates the refresh token when the relay returns a new one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: "tok2", refresh_token: "ref2", expires_in: 3600, token_type: "Bearer" }),
      ),
    );
    const token = await provider.refreshToken!({ clientId: "client-1", refreshToken: "ref1" });
    expect(token).toMatchObject({ accessToken: "tok2", refreshToken: "ref2" });
  });

  it("keeps the existing refresh token when the relay omits a new one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "tok2", expires_in: 3600, token_type: "Bearer" })),
    );
    const token = await provider.refreshToken!({ clientId: "client-1", refreshToken: "ref1" });
    expect(token).toMatchObject({ accessToken: "tok2", refreshToken: "ref1" });
  });

  it("requires a reconnect when the relay rejects the refresh (400/401/403)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 400 }));
    await expect(
      provider.refreshToken!({ clientId: "client-1", refreshToken: "ref1" }),
    ).rejects.toBeInstanceOf(IntegrationReconnectRequiredError);
  });

  it("stays connected on a transient relay failure (5xx)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 502 }));
    await expect(
      provider.refreshToken!({ clientId: "client-1", refreshToken: "ref1" }),
    ).rejects.toBeInstanceOf(IntegrationTemporaryAuthError);
  });
});

describe("createRelayProvider without refresh support", () => {
  it("omits refreshToken and applies the default expiry", async () => {
    const noRefresh = createRelayProvider({
      id: "github",
      label: "No Refresh",
      scopes: ["a"],
      authorizationEndpoint: "https://auth.example.com/authorize",
      supportsRefresh: false,
      defaultExpiresIn: 1000,
      fetchProfile: async () => ({ providerAccountId: "1", displayName: "Test" }),
    });
    expect(noRefresh.refreshToken).toBeUndefined();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "tok", token_type: "bearer", scope: "a" })),
    );
    const token = await noRefresh.exchangeCode!({
      clientId: "c",
      code: "code",
      redirectUri: "https://ext.chromiumapp.org/github/oauth",
      codeVerifier: "v",
    });
    expect(token.expiresIn).toBe(1000);
  });
});
