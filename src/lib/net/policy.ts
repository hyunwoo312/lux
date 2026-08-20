const REQUEST_TIMEOUT_MS = 10_000;
export const TOKEN_REQUEST_TIMEOUT_MS = 10_000;
export const FEEDBACK_TIMEOUT_MS = 15_000;

export function withTimeout(
  signal?: AbortSignal | null,
  timeoutMs = REQUEST_TIMEOUT_MS,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
