import { z } from "zod";
import { read, readResult, writeOrThrow } from "@/lib/storage";

const STORAGE_KEY = "integration-config";

const providerConfigSchema = z.object({
  spotifyClientId: z.string().min(1).optional(),
});
type ProviderConfigState = z.infer<typeof providerConfigSchema>;

const EMPTY_CONFIG: ProviderConfigState = {};

export async function readSpotifyClientId(): Promise<string | undefined> {
  return (await read(STORAGE_KEY, providerConfigSchema, EMPTY_CONFIG)).spotifyClientId;
}

export async function writeSpotifyClientId(clientId: string): Promise<void> {
  const current = await readResult(STORAGE_KEY, providerConfigSchema);
  if (current.status === "unreadable") {
    throw new Error("Provider settings could not be read, so nothing was changed.");
  }
  const state = current.status === "read" ? current.value : EMPTY_CONFIG;
  const next: ProviderConfigState = { ...state, spotifyClientId: clientId.trim() || undefined };
  await writeOrThrow(STORAGE_KEY, next);
}
