import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPermissionGranted } from "@/lib/permissions";

type PermissionPromptProps = {
  permission: chrome.runtime.ManifestPermission;
  message: string;
  onOpenSettings: () => void;
  variant?: "full" | "inline";
};

export function PermissionPrompt({
  permission,
  message,
  onOpenSettings,
  variant = "full",
}: PermissionPromptProps) {
  const enable = () => void setPermissionGranted(permission, true);

  if (variant === "inline") {
    return (
      <div className="
        border-border/60 bg-card/30 flex items-center gap-2.5 rounded-lg border border-dashed px-3
        py-2
      ">
        <Lock className="text-muted-foreground/60 size-4 shrink-0" aria-hidden />
        <span className="text-muted-foreground min-w-0 flex-1 text-xs">{message}</span>
        <button
          type="button"
          onClick={enable}
          className="
            text-foreground shrink-0 text-xs font-semibold underline-offset-2
            hover:underline
          "
        >
          Enable
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="
            text-muted-foreground
            hover:text-foreground
            shrink-0 text-xs underline-offset-2
            hover:underline
          "
        >
          Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 px-4 text-center">
      <Lock className="text-muted-foreground/60 size-6" aria-hidden />
      <p className="text-muted-foreground max-w-[34ch] text-sm text-balance">{message}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={enable}>
          Enable
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpenSettings}>
          Open settings
        </Button>
      </div>
    </div>
  );
}
