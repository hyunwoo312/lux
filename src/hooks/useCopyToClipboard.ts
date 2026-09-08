import { useCallback } from "react";
import { RESET_MS } from "@/lib/motion";
import { useTransientState } from "@/hooks/useTransientState";

export type CopyStatus = "idle" | "copied" | "failed";

export function useCopyToClipboard(): {
  status: CopyStatus;
  copy: (text: string) => void;
} {
  const [status, flash] = useTransientState<CopyStatus>("idle", RESET_MS);

  const copy = useCallback(
    (text: string) => {
      void (async () => {
        try {
          await navigator.clipboard.writeText(text);
          flash("copied");
        } catch {
          flash("failed");
        }
      })();
    },
    [flash],
  );

  return { status, copy };
}
