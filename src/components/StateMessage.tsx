import type { ComponentType, ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeFailure, type FailureTone } from "@/lib/net";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const TONE_ICON: Record<FailureTone, string> = {
  neutral: "text-ink-3",
  warning: "text-warning",
  error: "text-destructive",
};

type StateMessageProps = {
  icon?: ComponentType<{ className?: string }>;
  title?: ReactNode;
  message: ReactNode;
  tone?: FailureTone;
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
  const { message, icon, tone } = describeFailure(error, { service, subject });

  return (
    <StateMessage
      icon={icon}
      tone={tone}
      message={message}
      action={onRetry && <RetryButton onRetry={onRetry} retrying={retrying ?? false} />}
    />
  );
}
