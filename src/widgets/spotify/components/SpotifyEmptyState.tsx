import type { ReactNode } from "react";
import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import { Button } from "@/components/ui/button";

type SpotifyEmptyAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type SpotifyEmptyStateProps = {
  title: string;
  message: string;
  action?: SpotifyEmptyAction;
  extra?: ReactNode;
};

export function SpotifyEmptyState({ title, message, action, extra }: SpotifyEmptyStateProps) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-4 text-center">
      <SpotifyServiceIcon className="size-6" />
      <strong className="text-body font-semibold">{title}</strong>
      <span className="text-ink-3 text-caption leading-snug text-balance">{message}</span>
      {(action || extra) && (
        <div className="flex items-center gap-2">
          {action && (
            <Button onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </Button>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}
