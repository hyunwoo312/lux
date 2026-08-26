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
    const url = new URL(githubProvider.buildPkceAuthUrl({ ...params }));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("redirect_uri")).toBe(params.redirectUri);
    expect(url.searchParams.get("state")).toBe("state-xyz");
    expect(url.searchParams.get("scope")).toBe("read:user notifications repo");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("githubProvider.exchangeCode", () => {
  it("splits GitHub's comma-separated scopes and treats the token as non-expiring", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "tok",
          scope: "read:user,notifications,repo",
          token_type: "bearer",
        }),
      ),
    );

    const token = await githubProvider.exchangeCode({
      clientId: "client-123",
      code: "code-1",
      redirectUri: params.redirectUri,
      codeVerifier: "verifier-1",
    });

    expect(token.scopes).toEqual(["read:user", "notifications", "repo"]);
    expect(token.expiresIn).toBeGreaterThan(60 * 60 * 24 * 365);
  });
});

describe("githubProvider.fetchProfile", () => {
  it("maps the GitHub user payload to a profile", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 42,
          login: "octocat",
          name: "The Octocat",
          avatar_url: "https://x/y.png",
        }),
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
