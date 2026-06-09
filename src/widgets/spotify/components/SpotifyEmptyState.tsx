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
    <div className="flex h-full flex-col items-center justify-center gap-2.5 px-4 text-center">
      <SpotifyServiceIcon className="size-7" />
      <strong className="text-sm font-semibold">{title}</strong>
      <span className="text-muted-foreground text-xs leading-snug text-balance">{message}</span>
      {(action || extra) && (
        <div className="mt-1 flex items-center gap-2">
          {action && (
            <Button size="sm" onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </Button>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}
