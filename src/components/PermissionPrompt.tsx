import { Lock } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { setPermissionsGranted } from "@/lib/permissions";

type PermissionPromptProps = {
  permissions: readonly chrome.runtime.ManifestPermission[];
  message: string;
  onOpenSettings: () => void;
  variant?: "full" | "inline";
};

export function PermissionPrompt({
  permissions,
  message,
  onOpenSettings,
  variant = "full",
}: PermissionPromptProps) {
  const enable = () => void setPermissionsGranted(permissions, true);

  if (variant === "inline") {
    return (
      <div
        className="
          border-border/60 bg-card/30 flex items-center gap-2.5 rounded-lg border border-dashed px-3
          py-2
        "
      >
        <Lock className="text-ink-4 size-4 shrink-0" aria-hidden />
        <span className="text-ink-3 min-w-0 flex-1 text-caption">{message}</span>
        <Button size="xs" className="shrink-0" onClick={enable}>
          Enable
        </Button>
        <Button size="xs" variant="ghost" className="shrink-0" onClick={onOpenSettings}>
          Open settings
        </Button>
      </div>
    );
  }

  return (
    <StateMessage
      icon={Lock}
      message={message}
      action={
        <div className="flex items-center gap-2">
          <Button onClick={enable}>Enable</Button>
          <Button variant="ghost" onClick={onOpenSettings}>
            Open settings
          </Button>
        </div>
      }
    />
  );
}
