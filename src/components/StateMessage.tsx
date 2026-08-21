import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type StateMessageProps = {
  icon?: LucideIcon;
  message: ReactNode;
  action?: ReactNode;
};

export function StateMessage({ icon: Icon, message, action }: StateMessageProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      {Icon && <Icon className="text-ink-4 size-6" aria-hidden />}
      <p className="text-ink-3 max-w-[34ch] text-body text-balance">{message}</p>
      {action}
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
      {retrying ? (
        <>
          <Spinner />
          Retrying…
        </>
      ) : (
        "Retry"
      )}
    </Button>
  );
}
