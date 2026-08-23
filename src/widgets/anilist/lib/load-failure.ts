import { classifyLoadError, loadErrorMessage } from "@/lib/net";

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
