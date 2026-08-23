import { withTimeout } from "@/lib/net";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

export async function fetchYahoo(path: string, signal?: AbortSignal): Promise<unknown> {
  let lastError: Error | undefined;
  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}${path}`, { signal: withTimeout(signal) });
      if (!response.ok) {
        lastError = new Error(`Yahoo request failed (${response.status})`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
        continue;
      }
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error instanceof Error ? error : new Error("Yahoo request failed");
    }
  }
  throw lastError ?? new Error("Yahoo request failed");
}
