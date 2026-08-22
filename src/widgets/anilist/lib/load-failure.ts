import { HttpError, isOnline, loadErrorMessage, RateLimitError } from "@/lib/net";

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

export function loadFailureMessage(error: Error, subject: string): string {
  switch (classifyLoadError(error)) {
    case "rateLimited":
      return error.message;
    case "offline":
      return "You’re offline. Reconnect to see the latest.";
    case "auth":
      return `AniList turned down the request. Reconnect your account in Settings.`;
    case "unreachable":
      return `AniList isn’t responding, so ${subject} couldn’t load. That’s on their end — try again shortly.`;
    default:
      return `Couldn’t load ${subject}.`;
  }
}

export function writeFailureMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? loadErrorMessage(error, fallback) : fallback;
}
