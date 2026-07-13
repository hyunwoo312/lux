import { z } from "zod";

export const INTEGRATION_PROVIDER_IDS = [
  "google",
  "microsoft",
  "spotify",
  "github",
  "anilist",
] as const;
export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];
export const integrationProviderIdSchema = z.enum(INTEGRATION_PROVIDER_IDS);

export const integrationAccountStatusSchema = z.enum(["connected", "needsReconnect"]);
export type IntegrationAccountStatus = z.infer<typeof integrationAccountStatusSchema>;

export const integrationTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.number().int().positive(),
  tokenType: z.string().min(1).default("Bearer"),
  scopes: z.array(z.string().min(1)),
});

export const integrationAccountSchema = z.object({
  id: z.string().min(1),
  providerId: integrationProviderIdSchema,
  providerAccountId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email().optional().catch(undefined),
  avatarUrl: z.string().url().optional().catch(undefined),
  status: integrationAccountStatusSchema,
  token: integrationTokenSchema.optional(),
  connectedAt: z.string().datetime({ offset: true }),
  lastSyncedAt: z.string().datetime({ offset: true }).optional(),
  lastError: z.string().max(240).optional(),
});
export type IntegrationAccount = z.infer<typeof integrationAccountSchema>;

export const integrationStorageSchema = z.object({
  version: z.literal(1),
  accounts: z.record(z.string(), integrationAccountSchema),
});
export type IntegrationStorageState = z.infer<typeof integrationStorageSchema>;

export type IntegrationAccountSummary = Omit<IntegrationAccount, "token">;

export type IntegrationProfile = {
  providerAccountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
};

export type PkceAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
  codeChallenge: string;
};

export type IntegrationTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scopes: string[];
};

export type ExchangeCodeParams = {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
};

export type RefreshTokenParams = {
  clientId: string;
  refreshToken: string;
};

export type AcquireTokenParams = {
  clientId: string;
  state: string;
  interactive: boolean;
};

export type IntegrationProvider = {
  id: IntegrationProviderId;
  label: string;
  scopes: string[];
  clientIdEnvKey?: string;
  loadClientId?: () => Promise<string | undefined>;
  acquireToken?: (params: AcquireTokenParams) => Promise<IntegrationTokenResponse>;
  buildPkceAuthUrl?: (params: PkceAuthUrlParams) => string;
  exchangeCode?: (params: ExchangeCodeParams) => Promise<IntegrationTokenResponse>;
  refreshToken?: (params: RefreshTokenParams) => Promise<IntegrationTokenResponse>;
  fetchProfile: (accessToken: string) => Promise<IntegrationProfile>;
};
