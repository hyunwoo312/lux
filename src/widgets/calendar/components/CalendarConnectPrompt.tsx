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
      <Icon className="text-muted-foreground size-6" aria-hidden />
      <p className="text-muted-foreground text-sm">{message}</p>
      <Button size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
