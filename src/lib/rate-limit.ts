export class RateLimitError extends Error {
  override name = "RateLimitError";
}

export function rateLimitError(response: Response, now = Date.now()): RateLimitError | null {
  const isRateLimited =
    response.status === 429 ||
    (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
  if (!isRateLimited) return null;

  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  const resetEpochSeconds = Number(response.headers.get("x-ratelimit-reset"));
  const waitMs =
    retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : resetEpochSeconds > 0
        ? resetEpochSeconds * 1000 - now
        : 0;
  return new RateLimitError(`Rate limited — try again ${formatWait(waitMs)}.`);
}

function formatWait(waitMs: number): string {
  if (waitMs <= 0) return "in a moment";
  if (waitMs < 60_000) return `in ${Math.ceil(waitMs / 1000)}s`;
  return `in ${Math.ceil(waitMs / 60_000)}m`;
}

export function loadErrorMessage(error: Error, fallback: string): string {
  return error instanceof RateLimitError ? error.message : fallback;
}
