import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

const RESET_MS = 1600;

export function useCopyToClipboard(): {
  status: CopyStatus;
  copy: (text: string) => void;
} {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback((text: string) => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(text);
        setStatus("copied");
      } catch {
        setStatus("failed");
      }
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setStatus("idle"), RESET_MS);
    })();
  }, []);

  return { status, copy };
}
