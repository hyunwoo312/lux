import { TemporaryAuthError } from "@/lib/net/errors";
import { TOKEN_REQUEST_TIMEOUT_MS, withTimeout } from "@/lib/net/policy";

export async function fetchTokenEndpoint(
  label: string,
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: withTimeout(null, TOKEN_REQUEST_TIMEOUT_MS) });
  } catch {
    throw new TemporaryAuthError(`${label} could not be reached`);
  }
}
