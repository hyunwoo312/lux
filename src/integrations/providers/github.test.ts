import { afterEach, describe, expect, it, vi } from "vitest";
import { githubProvider } from "@/integrations/providers/github";

const params = {
  clientId: "client-123",
  redirectUri: "https://ext.chromiumapp.org/github/oauth",
  state: "state-xyz",
  codeChallenge: "challenge",
  scopes: githubProvider.scopes,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("githubProvider.buildPkceAuthUrl", () => {
  it("builds a GitHub authorize url with a PKCE challenge", () => {
    const url = new URL(githubProvider.buildPkceAuthUrl!({ ...params }));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("redirect_uri")).toBe(params.redirectUri);
    expect(url.searchParams.get("state")).toBe("state-xyz");
    expect(url.searchParams.get("scope")).toBe("read:user notifications repo");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("does not support refresh (GitHub tokens do not expire)", () => {
    expect(githubProvider.refreshToken).toBeUndefined();
  });
});

describe("githubProvider.exchangeCode", () => {
  it("posts the PKCE code to the Lux token relay and maps the token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: "tok", scope: "read:user,notifications,repo", token_type: "bearer" }),
      ),
    );

    const token = await githubProvider.exchangeCode!({
      clientId: "client-123",
      code: "code-1",
      redirectUri: params.redirectUri,
      codeVerifier: "verifier-1",
    });

    expect(token.accessToken).toBe("tok");
    expect(token.scopes).toEqual(["read:user", "notifications", "repo"]);
    expect(token.expiresIn).toBeGreaterThan(60 * 60 * 24 * 365);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://lux.hyunwk.me/github/token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: "code-1",
          redirect_uri: params.redirectUri,
          code_verifier: "verifier-1",
        }),
      }),
    );
  });

  it("throws when the relay returns no access token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "bad" })));
    await expect(
      githubProvider.exchangeCode!({
        clientId: "client-123",
        code: "code-1",
        redirectUri: params.redirectUri,
        codeVerifier: "verifier-1",
      }),
    ).rejects.toThrow();
  });
});

describe("githubProvider.fetchProfile", () => {
  it("maps the GitHub user payload to a profile", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ id: 42, login: "octocat", name: "The Octocat", avatar_url: "https://x/y.png" }),
      ),
    );

    const profile = await githubProvider.fetchProfile("tok");
    expect(profile).toEqual({
      providerAccountId: "42",
      displayName: "The Octocat",
      email: undefined,
      avatarUrl: "https://x/y.png",
    });
  });
});
