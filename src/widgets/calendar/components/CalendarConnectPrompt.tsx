import type { LucideIcon } from "lucide-react";
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
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <Icon className="text-ink-3 size-6" aria-hidden />
      <p className="text-ink-3 text-body">{message}</p>
      <Button size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
