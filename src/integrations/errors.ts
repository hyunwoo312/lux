export class IntegrationReconnectRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationReconnectRequiredError";
  }
}

export class IntegrationTemporaryAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationTemporaryAuthError";
  }
}

export function isReconnectRequiredStatus(status: number): boolean {
  return status === 400 || status === 401 || status === 403;
}

const TOKEN_REQUEST_TIMEOUT_MS = 10_000;

export async function fetchTokenEndpoint(
  label: string,
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new IntegrationTemporaryAuthError(`${label} could not be reached`);
  }
}
