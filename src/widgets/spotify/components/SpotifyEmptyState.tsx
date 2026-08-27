import type { ReactNode } from "react";
import { StateMessage } from "@/components/StateMessage";
import { SpotifyServiceIcon } from "@/components/icons/service-icons";

type SpotifyEmptyStateProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function SpotifyEmptyState({ title, message, action }: SpotifyEmptyStateProps) {
  return <StateMessage icon={SpotifyServiceIcon} title={title} message={message} action={action} />;
}
