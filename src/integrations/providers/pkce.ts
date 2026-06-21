import type { PkceAuthUrlParams } from "@/integrations/types";

export type PkceAuthorizeConfig = {
  authorizationEndpoint: string;
  authParams?: Record<string, string>;
};

export function buildPkceAuthorizeUrl(
  config: PkceAuthorizeConfig,
  { clientId, redirectUri, state, codeChallenge, scopes }: PkceAuthUrlParams,
): string {
  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  for (const [key, value] of Object.entries(config.authParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export function parseScopes(scope: string | undefined, fallback: string[]): string[] {
  const parsed = scope?.split(/[\s,]+/).filter(Boolean) ?? [];
  return parsed.length > 0 ? parsed : fallback;
}
