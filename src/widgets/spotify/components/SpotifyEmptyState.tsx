import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/StateMessage";
import { SpotifyServiceIcon } from "@/components/icons/service-icons";

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
    <StateMessage
      icon={SpotifyServiceIcon}
      title={title}
      message={message}
      action={
        action || extra ? (
          <div className="flex items-center gap-2">
            {action && (
              <Button onClick={action.onClick} disabled={action.disabled}>
                {action.label}
              </Button>
            )}
            {extra}
          </div>
        ) : undefined
      }
    />
  );
}
