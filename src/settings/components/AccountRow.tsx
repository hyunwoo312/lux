import type { ComponentType } from "react";
import { useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type { ProviderMeta } from "@/settings/providers";
import type { useIntegrationStore } from "@/integrations";
import type { AccentPreset } from "@/widgets/core/accent";
import { accentClass } from "@/widgets/core/accent";

type IntegrationAccount = ReturnType<typeof useIntegrationStore.getState>["accounts"][number];

type Props = {
  provider: ProviderMeta;
  account: IntegrationAccount | undefined;
  busy: "connecting" | "disconnecting" | undefined;
  connectDisabled: boolean;
  brand?: AccentPreset;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function AccountRow({
  provider,
  account,
  busy,
  connectDisabled,
  brand,
  onConnect,
  onDisconnect,
}: Props) {
  const status = account?.status;
  const identity = account?.email ?? account?.displayName ?? "Connected";
  const subline =
    status === "connected"
      ? account?.lastSyncedAt
        ? `${identity} · synced ${formatRelativeTime(account.lastSyncedAt)}`
        : identity
      : status === "needsReconnect"
        ? "Reconnect to continue"
        : connectDisabled
          ? "Add your Client ID below to connect"
          : provider.description;

  return (
    <div className="flex items-center gap-3 py-2">
      <AccountAvatar
        key={account?.avatarUrl ?? provider.id}
        Icon={provider.icon}
        avatarUrl={account?.avatarUrl}
        connected={Boolean(account)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium">{provider.label}</span>
          <StatusBadge status={status} />
        </div>
        <span className="text-ink-3 truncate text-caption">{subline}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {account ? (
          <>
            {status === "needsReconnect" && (
              <Button
                variant="ghost"
                className="text-warning hover:text-warning"
                disabled={Boolean(busy)}
                onClick={onConnect}
              >
                {busy === "connecting" ? "Reconnecting…" : "Reconnect"}
              </Button>
            )}
            <Button variant="ghost-destructive" disabled={Boolean(busy)} onClick={onDisconnect}>
              {busy === "disconnecting" ? "Disconnecting…" : "Disconnect"}
            </Button>
          </>
        ) : (
          <Button
            variant={brand ? "default" : "secondary"}
            className={cn(accentClass(brand))}
            disabled={Boolean(busy) || connectDisabled}
            onClick={onConnect}
          >
            {busy === "connecting" ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: "connected" | "needsReconnect" }) {
  const label =
    status === "connected"
      ? "Connected"
      : status === "needsReconnect"
        ? "Reconnect needed"
        : "Not connected";
  const tone =
    status === "connected"
      ? "text-success"
      : status === "needsReconnect"
        ? "text-warning"
        : "text-ink-3";
  return (
    <span className={cn("inline-flex items-center gap-1 text-micro font-medium", tone)}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function AccountAvatar({
  Icon,
  avatarUrl,
  connected,
}: {
  Icon: ComponentType<{ className?: string }>;
  avatarUrl?: string;
  connected: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = connected && Boolean(avatarUrl) && !broken;

  if (!showImage) {
    return (
      <span className="inline-flex size-9 shrink-0 items-center justify-center">
        <Icon className="size-6 object-contain" />
      </span>
    );
  }

  return (
    <span className="relative inline-flex size-9 shrink-0">
      <Icon className="absolute top-0 left-0 size-6 object-contain" />
      <RemoteImage
        src={avatarUrl}
        alt=""
        aria-hidden
        onError={() => setBroken(true)}
        className="
          border-background absolute right-0 bottom-0 size-6 rounded-full border-2 object-cover
        "
      />
    </span>
  );
}
