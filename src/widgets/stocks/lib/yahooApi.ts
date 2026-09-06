import { ensureOk, HttpError, withTimeout } from "@/lib/net";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

export async function fetchYahoo(path: string, signal?: AbortSignal): Promise<unknown> {
  let lastError: Error | undefined;
  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}${path}`, { signal: withTimeout(signal) });
      ensureOk(response, `Yahoo request failed (${response.status})`);
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error instanceof Error ? error : new Error("Yahoo request failed");
      if (error instanceof HttpError && error.status < 500) break;
    }
  }
  throw lastError ?? new Error("Yahoo request failed");
}
