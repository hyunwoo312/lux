import { z } from "zod";
import { ensureOk, HttpError, readJson, withTimeout } from "@/lib/net";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
const MAX_REQUESTS = 4;
let active = 0;
const waiting: (() => void)[] = [];

async function acquire(signal?: AbortSignal): Promise<() => void> {
  signal?.throwIfAborted();
  if (active < MAX_REQUESTS) active += 1;
  else
    await new Promise<void>((resolve, reject) => {
      const enter = () => {
        signal?.removeEventListener("abort", cancel);
        resolve();
      };
      const cancel = () => {
        const index = waiting.indexOf(enter);
        if (index >= 0) waiting.splice(index, 1);
        reject(signal?.reason ?? new DOMException("Request cancelled", "AbortError"));
      };
      waiting.push(enter);
      signal?.addEventListener("abort", cancel, { once: true });
    });
  return () => {
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
  };
}

export async function fetchYahoo(path: string, signal?: AbortSignal): Promise<unknown> {
  const release = await acquire(signal);
  try {
    signal?.throwIfAborted();
    return await requestYahoo(path, signal);
  } finally {
    release();
  }
}

async function requestYahoo(path: string, signal?: AbortSignal): Promise<unknown> {
  let lastError: Error | undefined;
  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}${path}`, { signal: withTimeout(signal) });
      ensureOk(response, `Yahoo request failed (${response.status})`);
      return await readJson(response, "Yahoo", z.unknown());
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error instanceof Error ? error : new Error("Yahoo request failed");
      if (error instanceof HttpError && error.status < 500) break;
    }
  }
  throw lastError ?? new Error("Yahoo request failed");
}
