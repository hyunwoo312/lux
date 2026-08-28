import { Lock } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { useGrantedPermissions } from "@/hooks/usePermission";
import { setPermissionsGranted } from "@/lib/permissions";

type PermissionPromptProps = {
  permissions: readonly chrome.runtime.ManifestPermission[];
  message: string;
  partlyGrantedMessage?: string;
  onOpenSettings: () => void;
};

function usePromptMessage({ permissions, message, partlyGrantedMessage }: PermissionPromptProps) {
  const granted = useGrantedPermissions();
  const partlyGranted = permissions.some((permission) => granted?.has(permission));
  return partlyGranted && partlyGrantedMessage ? partlyGrantedMessage : message;
}

const enable = (permissions: readonly chrome.runtime.ManifestPermission[]) =>
  void setPermissionsGranted(permissions, true);

export function PermissionPrompt(props: PermissionPromptProps) {
  const message = usePromptMessage(props);

  return (
    <StateMessage
      icon={Lock}
      message={message}
      action={
        <div className="flex items-center gap-2">
          <Button onClick={() => enable(props.permissions)}>Enable</Button>
          <Button variant="ghost" onClick={props.onOpenSettings}>
            Open settings
          </Button>
        </div>
      }
    />
  );
}

export function InlinePermissionPrompt(props: PermissionPromptProps) {
  const message = usePromptMessage(props);

  return (
    <div
      className="
        border-border/60 bg-card/30 flex items-center gap-2.5 rounded-lg border border-dashed px-3
        py-2
      "
    >
      <Lock className="text-ink-3 size-4 shrink-0" aria-hidden />
      <span className="text-ink-3 min-w-0 flex-1 text-caption">{message}</span>
      <Button size="xs" className="shrink-0" onClick={() => enable(props.permissions)}>
        Enable
      </Button>
      <Button size="xs" variant="ghost" className="shrink-0" onClick={props.onOpenSettings}>
        Open settings
      </Button>
    </div>
  );
}
