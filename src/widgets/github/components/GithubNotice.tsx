import type { ReactNode } from "react";
import { AlertCircle, RotateCw, WifiOff } from "lucide-react";
import { isOnline, loadErrorMessage } from "@/lib/net";

const NOTICE =
  "text-ink-3 flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-body";

type GithubNoticeProps = {
  children?: ReactNode;
  error?: unknown;
  fallback?: string;
  onRetry?: () => void;
};

export function GithubNotice({ children, error, fallback, onRetry }: GithubNoticeProps) {
  const offline = error !== undefined && !isOnline();
  const Icon = offline ? WifiOff : AlertCircle;
  const reason = fallback ?? "Couldn’t reach GitHub.";
  const message = offline
    ? "You’re offline — GitHub will load when the connection is back."
    : error instanceof Error
      ? loadErrorMessage(error, reason)
      : reason;

  return (
    <div className={NOTICE}>
      {error === undefined ? (
        children
      ) : (
        <>
          <Icon className="text-ink-4 size-5" aria-hidden />
          <p>{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="
                press focus-ring text-ink-2 bg-foreground/5 flex cursor-pointer items-center gap-1.5
                rounded-md px-2 py-1 text-caption
                hover:bg-foreground/10 hover:text-ink
              "
            >
              <RotateCw className="size-3.5" aria-hidden />
              Try again
            </button>
          )}
        </>
      )}
    </div>
  );
}
