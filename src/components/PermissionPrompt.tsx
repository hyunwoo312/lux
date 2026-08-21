import { Lock } from "lucide-react";
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
        <button
          type="button"
          onClick={enable}
          className="
            text-ink shrink-0 text-caption font-semibold underline-offset-2
            hover:underline
          "
        >
          Enable
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="
            text-ink-3
            hover:text-ink
            shrink-0 text-caption underline-offset-2
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
      <Lock className="text-ink-4 size-6" aria-hidden />
      <p className="text-ink-3 max-w-[34ch] text-body text-balance">{message}</p>
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
