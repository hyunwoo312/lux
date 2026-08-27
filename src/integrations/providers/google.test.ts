import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationReconnectRequiredError } from "@/integrations/errors";
import { GOOGLE_SCOPES, googleProvider } from "@/integrations/providers/google";
import manifestRaw from "@/../public/manifest.json?raw";

function identityMock() {
  return globalThis.chrome.identity as unknown as {
    getAuthToken: ReturnType<typeof vi.fn>;
    removeCachedAuthToken: ReturnType<typeof vi.fn>;
  };
}

const params = { clientId: "unused", state: "state-xyz", interactive: false };

beforeEach(() => {
  identityMock().getAuthToken.mockResolvedValue({
    token: "fresh-token",
    grantedScopes: [...GOOGLE_SCOPES],
  });
  identityMock().removeCachedAuthToken.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("googleProvider.acquireToken", () => {
  it("returns the token Chrome issued and the scopes it actually granted", async () => {
    const token = await googleProvider.acquireToken(params);

    expect(token.accessToken).toBe("fresh-token");
    expect(token.scopes).toEqual([...GOOGLE_SCOPES]);
    expect(token.expiresIn).toBeGreaterThan(300);
  });

  it("evicts a stale token before asking Chrome, so the cache cannot serve it again", async () => {
    await googleProvider.acquireToken({ ...params, staleToken: "expired-token" });

    expect(identityMock().removeCachedAuthToken).toHaveBeenCalledWith({ token: "expired-token" });
    expect(identityMock().getAuthToken).toHaveBeenCalled();
  });

  it("rejects a token whose granted scopes are missing one we asked for", async () => {
    identityMock().getAuthToken.mockResolvedValue({
      token: "partial-token",
      grantedScopes: ["https://www.googleapis.com/auth/userinfo.email"],
    });

    await expect(googleProvider.acquireToken(params)).rejects.toBeInstanceOf(
      IntegrationReconnectRequiredError,
    );
    expect(identityMock().removeCachedAuthToken).toHaveBeenCalledWith({ token: "partial-token" });
  });

  it("asks for a reconnect when a silent refresh cannot produce a token", async () => {
    identityMock().getAuthToken.mockRejectedValue(new Error("not signed in"));

    await expect(googleProvider.acquireToken(params)).rejects.toBeInstanceOf(
      IntegrationReconnectRequiredError,
    );
  });

  it("reports a failed sign-in rather than a reconnect when the user was prompted", async () => {
    identityMock().getAuthToken.mockRejectedValue(new Error("cancelled"));

    const error = await googleProvider
      .acquireToken({ ...params, interactive: true })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(IntegrationReconnectRequiredError);
  });
});

describe("the manifest Chrome will read", () => {
  const manifest = JSON.parse(manifestRaw) as {
    oauth2?: { client_id?: string; scopes?: string[] };
  };

  it("declares the same scopes the provider asks Chrome for", () => {
    expect(manifest.oauth2?.scopes).toEqual(GOOGLE_SCOPES);
  });

  it("carries a Chrome-extension client id, since nothing else supplies one", () => {
    expect(manifest.oauth2?.client_id).toMatch(/\.apps\.googleusercontent\.com$/);
  });
});
