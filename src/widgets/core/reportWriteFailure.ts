import { loadErrorMessage } from "@/lib/net";
import { showToast } from "@/stores/useToastStore";

export function reportWriteFailure(key: string, error: unknown, fallback: string): void {
  showToast({ key, message: loadErrorMessage(error, fallback) });
}
