import { TemporaryAuthError } from "@/lib/net/errors";
import { REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/net/policy";

export async function fetchTokenEndpoint(
  label: string,
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: withTimeout(null, REQUEST_TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new TemporaryAuthError(`${label} could not be reached`);
  }
}
