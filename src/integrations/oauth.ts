function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createOAuthState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function createCodeVerifier(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

export function parseAuthCodeCallback(url: string): { code: string; state: string } {
  const parsed = new URL(url);
  const error = parsed.searchParams.get("error");

  if (error) {
    throw new Error(`OAuth authorization failed: ${error}`);
  }

  const code = parsed.searchParams.get("code");
  const state = parsed.searchParams.get("state");

  if (!code || !state) {
    throw new Error("OAuth callback is missing code or state");
  }

  return { code, state };
}

export type ImplicitTokenCallback = {
  accessToken: string;
  expiresIn: number;
  state: string;
  tokenType: string;
};

export function parseImplicitTokenCallback(url: string): ImplicitTokenCallback {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const error = params.get("error") ?? parsed.searchParams.get("error");

  if (error) {
    throw new Error(`OAuth authorization failed: ${error}`);
  }

  const accessToken = params.get("access_token");
  const expiresIn = Number(params.get("expires_in"));
  const state = params.get("state");
  const tokenType = params.get("token_type") ?? "Bearer";

  if (!accessToken || !state || !Number.isFinite(expiresIn)) {
    throw new Error("OAuth callback is missing access token, expiry, or state");
  }

  return { accessToken, expiresIn, state, tokenType };
}

export function getRedirectUri(path: string): string {
  if (typeof chrome === "undefined" || !chrome.identity?.getRedirectURL) {
    throw new Error("Browser identity API is unavailable");
  }

  return chrome.identity.getRedirectURL(path);
}

export async function launchWebAuthFlow(url: string, interactive: boolean): Promise<string> {
  if (typeof chrome === "undefined" || !chrome.identity?.launchWebAuthFlow) {
    throw new Error("Browser identity API is unavailable");
  }

  const redirectUrl = await chrome.identity.launchWebAuthFlow({ url, interactive });

  if (!redirectUrl) {
    throw new Error("OAuth flow did not return a redirect URL");
  }

  return redirectUrl;
}
