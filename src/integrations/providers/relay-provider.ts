import {
  createCodeProvider,
  type CodeProviderConfig,
} from "@/integrations/providers/code-provider";
import { RELAY_BASE_URL } from "@/lib/relay";
import type { CodeAuthProvider } from "@/integrations/types";

type RelayProviderConfig = Omit<CodeProviderConfig, "tokenRequest">;

export function createRelayProvider(config: RelayProviderConfig): CodeAuthProvider {
  const url = `${RELAY_BASE_URL}/${config.id}/token`;

  return createCodeProvider({
    ...config,
    tokenRequest: (grant) => ({
      url,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          grant.grant === "authorization_code"
            ? {
                grant_type: "authorization_code",
                code: grant.code,
                redirect_uri: grant.redirectUri,
                code_verifier: grant.codeVerifier,
              }
            : { grant_type: "refresh_token", refresh_token: grant.refreshToken },
        ),
      },
    }),
  });
}
