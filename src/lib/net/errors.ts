import type { ZodIssue, ZodType } from "zod";
import { isOnline } from "@/lib/net/online";

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export class RateLimitError extends Error {
  readonly retryAfterMs: number;
  constructor(
    retryAfterMs: number,
    message = `Rate limited — try again ${formatWait(retryAfterMs)}.`,
  ) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class InvalidResponseError extends Error {
  readonly issues: readonly ZodIssue[];
  constructor(label: string, issues: readonly ZodIssue[]) {
    super(`Unexpected ${label} response`);
    this.name = "InvalidResponseError";
    this.issues = issues;
  }
}

export class TemporaryAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemporaryAuthError";
  }
}

function formatWait(waitMs: number): string {
  if (waitMs <= 0) return "in a moment";
  if (waitMs < 60_000) return `in ${Math.ceil(waitMs / 1000)}s`;
  return `in ${Math.ceil(waitMs / 60_000)}m`;
}

export function retryAfterMs(response: Response, now = Date.now()): number {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  if (retryAfterSeconds > 0) return retryAfterSeconds * 1000;
  const resetEpochSeconds = Number(response.headers.get("x-ratelimit-reset"));
  if (resetEpochSeconds > 0) return Math.max(0, resetEpochSeconds * 1000 - now);
  return 0;
}

export function rateLimitError(response: Response, now = Date.now()): RateLimitError | null {
  const isRateLimited =
    response.status === 429 ||
    (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
  if (!isRateLimited) return null;
  return new RateLimitError(retryAfterMs(response, now));
}

type LoadFailure = "offline" | "unreachable" | "rateLimited" | "auth" | "other";

export function classifyLoadError(error: Error): LoadFailure {
  if (!isOnline()) return "offline";
  if (error instanceof RateLimitError) return "rateLimited";
  if (error instanceof HttpError) {
    if (error.status >= 500) return "unreachable";
    if (error.status === 401 || error.status === 403) return "auth";
    return "other";
  }
  if (error instanceof TypeError) return "unreachable";
  if (error.name === "TimeoutError") return "unreachable";
  return "other";
}

export function loadErrorMessage(error: Error, fallback: string): string {
  return error instanceof RateLimitError ? error.message : fallback;
}

export function parseResponse<T>(label: string, schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new InvalidResponseError(label, result.error.issues);
  return result.data;
}

export function ensureOk(response: Response, message: string): void {
  if (response.ok) return;
  throw rateLimitError(response) ?? new HttpError(response.status, message);
}
