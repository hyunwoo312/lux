import {
  createCodeProvider,
  type CodeProviderConfig,
} from "@/integrations/providers/code-provider";
import type { CodeAuthProvider } from "@/integrations/types";

const DEFAULT_EXPIRES_IN = 3600;

type PkceProviderConfig = Omit<
  CodeProviderConfig,
  "tokenRequest" | "clientId" | "supportsRefresh" | "defaultExpiresIn"
> & {
  tokenEndpoint: string;
};

export function createPkceProvider({
  tokenEndpoint,
  ...config
}: PkceProviderConfig): CodeAuthProvider {
  return createCodeProvider({
    ...config,
    supportsRefresh: true,
    defaultExpiresIn: DEFAULT_EXPIRES_IN,
    tokenRequest: (grant) => ({
      url: tokenEndpoint,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(
          grant.grant === "authorization_code"
            ? {
                client_id: grant.clientId,
                grant_type: "authorization_code",
                code: grant.code,
                redirect_uri: grant.redirectUri,
                code_verifier: grant.codeVerifier,
              }
            : {
                client_id: grant.clientId,
                grant_type: "refresh_token",
                refresh_token: grant.refreshToken,
              },
        ),
      },
    }),
  });
}
