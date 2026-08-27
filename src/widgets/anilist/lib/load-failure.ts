import { loadErrorMessage } from "@/lib/net";

export function writeFailureMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? loadErrorMessage(error, fallback) : fallback;
}
