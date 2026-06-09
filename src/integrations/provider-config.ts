import { z } from "zod";
import { read, write } from "@/lib/storage";

const STORAGE_KEY = "integration-config";

const providerConfigSchema = z.object({
  version: z.literal(1),
  spotifyClientId: z.string().min(1).optional(),
});
type ProviderConfigState = z.infer<typeof providerConfigSchema>;

const EMPTY_CONFIG: ProviderConfigState = { version: 1 };

async function readConfig(): Promise<ProviderConfigState> {
  return read(STORAGE_KEY, providerConfigSchema, EMPTY_CONFIG);
}

export async function readSpotifyClientId(): Promise<string | undefined> {
  return (await readConfig()).spotifyClientId;
}

export async function writeSpotifyClientId(clientId: string): Promise<void> {
  const state = await readConfig();
  const next = providerConfigSchema.parse({
    ...state,
    spotifyClientId: clientId.trim() || undefined,
  });
  await write(STORAGE_KEY, next);
}
