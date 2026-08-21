import type { LucideIcon } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";

type CalendarConnectPromptProps = {
  icon: LucideIcon;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function CalendarConnectPrompt({
  icon: Icon,
  message,
  actionLabel,
  onAction,
}: CalendarConnectPromptProps) {
  return (
    <StateMessage
      icon={Icon}
      message={message}
      action={<Button onClick={onAction}>{actionLabel}</Button>}
    />
  );
}
