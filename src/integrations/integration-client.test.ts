import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { integrationFetch } from "@/integrations/integration-client";
import { writeSpotifyClientId } from "@/integrations/provider-config";
import { getAccountByProvider, writeAccount } from "@/integrations/token-store";
import type { IntegrationAccount } from "@/integrations/types";

const CONFIG_KEY = "lux:integration-config";
const API_URL = "https://api.spotify.com/v1/me/player";

function expiredSpotifyAccount(): IntegrationAccount {
  return {
    id: "spotify-1",
    providerId: "spotify",
    providerAccountId: "user-1",
    displayName: "Someone",
    status: "connected",
    connectedAt: "2026-08-01T00:00:00.000Z",
    token: {
      accessToken: "stale-access-token",
      refreshToken: "the-refresh-token",
      expiresAt: Date.now() - 60_000,
      tokenType: "Bearer",
      scopes: ["user-read-playback-state"],
    },
  };
}

function tokenResponse(): Response {
  return new Response(
    JSON.stringify({
      access_token: "fresh-access-token",
      refresh_token: "rotated-refresh-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "user-read-playback-state",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(async () => {
  await chrome.storage.local.clear();
  await writeSpotifyClientId("client-abc");
  await writeAccount(expiredSpotifyAccount());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refreshing a Spotify token", () => {
  it("keeps the account connected when the client ID cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("accounts.spotify.com")
          ? tokenResponse()
          : new Response("{}", { status: 200 }),
      ),
    );
    await chrome.storage.local.set({ [CONFIG_KEY]: { version: 1, spotifyClientId: 42 } });

    await expect(integrationFetch("spotify", API_URL)).rejects.toThrow();

    const account = await getAccountByProvider("spotify");
    expect(account?.status).toBe("connected");
    expect(account?.token?.refreshToken).toBe("the-refresh-token");
  });

  it("keeps the account connected when the token request fails with a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("accounts.spotify.com")) {
          throw new TypeError("Failed to fetch");
        }
        return new Response("{}", { status: 200 });
      }),
    );

    await expect(integrationFetch("spotify", API_URL)).rejects.toThrow();

    const account = await getAccountByProvider("spotify");
    expect(account?.status).toBe("connected");
    expect(account?.token?.refreshToken).toBe("the-refresh-token");
  });

  it("keeps the refresh token when the grant is genuinely rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("accounts.spotify.com")
          ? new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
          : new Response("{}", { status: 200 }),
      ),
    );

    await expect(integrationFetch("spotify", API_URL)).rejects.toThrow();

    const account = await getAccountByProvider("spotify");
    expect(account?.status).toBe("needsReconnect");
    expect(account?.token?.refreshToken).toBe("the-refresh-token");
  });

  it("keeps the account connected when the refreshed token cannot be persisted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("accounts.spotify.com")
          ? tokenResponse()
          : new Response("{}", { status: 200 }),
      ),
    );
    vi.spyOn(chrome.storage.local, "set").mockRejectedValueOnce(new Error("storage down"));

    await expect(integrationFetch("spotify", API_URL)).rejects.toThrow(/storage down/);

    const account = await getAccountByProvider("spotify");
    expect(account?.status).toBe("connected");
    expect(account?.token?.accessToken).toBe("stale-access-token");
  });

  it("refreshes once when two requests find the token expired at the same time", async () => {
    let tokenRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (!String(input).includes("accounts.spotify.com")) {
          return new Response("{}", { status: 200 });
        }
        tokenRequests += 1;
        return tokenResponse();
      }),
    );

    await Promise.all([integrationFetch("spotify", API_URL), integrationFetch("spotify", API_URL)]);

    expect(tokenRequests).toBe(1);
  });

  it("refreshes and stores the rotated token on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("accounts.spotify.com")
          ? tokenResponse()
          : new Response("{}", { status: 200 }),
      ),
    );

    const response = await integrationFetch("spotify", API_URL);

    expect(response.status).toBe(200);
    const account = await getAccountByProvider("spotify");
    expect(account?.status).toBe("connected");
    expect(account?.token?.accessToken).toBe("fresh-access-token");
    expect(account?.token?.refreshToken).toBe("rotated-refresh-token");
  });
});

describe("provider rate limiting", () => {
  it("skips requests while the provider is rate limited, and resumes after the window", async () => {
    vi.useFakeTimers();
    const limitedResponse = () =>
      new Response("", { status: 429, headers: { "retry-after": "30" } });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValue(limitedResponse());
    vi.stubGlobal("fetch", fetchMock);

    expect((await integrationFetch("spotify", API_URL)).status).toBe(429);

    const callsWhenLimited = fetchMock.mock.calls.length;
    await expect(integrationFetch("spotify", API_URL)).rejects.toThrow(/rate limited/i);
    expect(fetchMock.mock.calls.length).toBe(callsWhenLimited);

    vi.setSystemTime(Date.now() + 31_000);
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    expect((await integrationFetch("spotify", API_URL)).status).toBe(200);

    vi.useRealTimers();
  });
});
