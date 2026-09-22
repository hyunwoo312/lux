import { z } from "zod";
import { ensureOk, readJson, withTimeout } from "@/lib/net";

const ESPN_SPORTS_API = "https://site.api.espn.com/apis/site/v2/sports";

export function espnUrl(path: string, resource: string, query = ""): string {
  return `${ESPN_SPORTS_API}/${path}/${resource}${query}`;
}

export async function fetchEspn(
  url: string,
  message: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(url, { signal: withTimeout(signal) });
  ensureOk(response, message);
  return readJson(response, "ESPN", z.unknown());
}
