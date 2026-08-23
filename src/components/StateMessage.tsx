import type { ComponentType, ReactNode } from "react";
import { AlertCircle, Lock, RotateCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { classifyLoadError } from "@/lib/net";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type StateTone = "neutral" | "warning" | "error";

const TONE_ICON: Record<StateTone, string> = {
  neutral: "text-ink-4",
  warning: "text-warning",
  error: "text-destructive",
};

type StateMessageProps = {
  icon?: ComponentType<{ className?: string }>;
  title?: ReactNode;
  message: ReactNode;
  tone?: StateTone;
  compact?: boolean;
  action?: ReactNode;
};

export function StateMessage({
  icon: Icon,
  title,
  message,
  tone = "neutral",
  compact = false,
  action,
}: StateMessageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="m-auto flex max-w-full flex-col items-center gap-3 px-4 py-2 text-center">
        {Icon && <Icon className={cn("size-6 shrink-0", TONE_ICON[tone])} aria-hidden />}
        <div className="flex max-w-[34ch] flex-col gap-1">
          {title && <p className="text-ink text-body font-medium text-balance">{title}</p>}
          <p className={cn("text-ink-3 text-balance", compact ? "text-caption" : "text-body")}>
            {message}
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}

type RetryButtonProps = {
  onRetry: () => void;
  retrying: boolean;
};

export function RetryButton({ onRetry, retrying }: RetryButtonProps) {
  return (
    <Button variant="outline" onClick={onRetry} disabled={retrying}>
      {retrying ? <Spinner /> : <RotateCw />}
      {retrying ? "Retrying…" : "Retry"}
    </Button>
  );
}

type ErrorStateProps = {
  error?: unknown;
  service: string;
  subject?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ErrorState({ error, service, subject, onRetry, retrying }: ErrorStateProps) {
  const failure = error instanceof Error ? classifyLoadError(error) : "other";
  const thing = subject ?? service;

  const message =
    failure === "offline"
      ? "You’re offline — this will load when your connection is back."
      : failure === "rateLimited" && error instanceof Error
        ? error.message
        : failure === "auth"
          ? `${service} turned down the request. Reconnect your account in Settings.`
          : failure === "unreachable"
            ? `${service} isn’t responding, so ${thing} couldn’t load. Try again shortly.`
            : `Couldn’t load ${thing}.`;

  const icon = failure === "offline" ? WifiOff : failure === "auth" ? Lock : AlertCircle;
  const tone: StateTone =
    failure === "offline" ? "neutral" : failure === "auth" ? "warning" : "error";

  return (
    <StateMessage
      icon={icon}
      tone={tone}
      message={message}
      action={onRetry && <RetryButton onRetry={onRetry} retrying={retrying ?? false} />}
    />
  );
}
