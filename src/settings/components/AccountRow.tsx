import type { ComponentType } from "react";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { fade } from "@/lib/motion";
import type { ProviderMeta } from "@/settings/providers";
import type { IntegrationAccountSummary } from "@/integrations";
import type { AccentPreset } from "@/widgets/core/accent";
import { accentClass } from "@/widgets/core/accent";

type Props = {
  provider: ProviderMeta;
  account: IntegrationAccountSummary | null;
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
      ? account?.lastAuthorizedAt
        ? `Authorized ${formatRelativeTime(account.lastAuthorizedAt)}`
        : null
      : status === "needsReconnect"
        ? "Reconnect to continue"
        : connectDisabled
          ? "Add your Client ID below to connect"
          : provider.description;

  return (
    <div className="flex flex-wrap items-start gap-3 py-2">
      <AccountAvatar
        key={account?.avatarUrl ?? provider.id}
        Icon={provider.icon}
        avatarUrl={account?.avatarUrl}
        connected={Boolean(account)}
      />
      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body font-medium">{provider.label}</span>
          <StatusBadge status={status} busy={busy} />
        </div>
        {account && <span className="text-ink-2 text-caption wrap-anywhere">{identity}</span>}
        {subline && <span className="text-ink-3 text-caption wrap-anywhere">{subline}</span>}
      </div>
      <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
        {account ? (
          <>
            {status === "needsReconnect" && (
              <Button
                variant="ghost"
                className="text-warning relative hover:text-warning"
                disabled={Boolean(busy)}
                aria-busy={busy === "connecting" || undefined}
                aria-label={busy === "connecting" ? `Reconnecting ${provider.label}` : undefined}
                onClick={onConnect}
              >
                <span className={cn(busy === "connecting" && "invisible")}>Reconnect</span>
                {busy === "connecting" && <PendingIndicator />}
              </Button>
            )}
            <Button
              variant="ghost-destructive"
              className="relative"
              disabled={Boolean(busy)}
              aria-busy={busy === "disconnecting" || undefined}
              aria-label={busy === "disconnecting" ? `Disconnecting ${provider.label}` : undefined}
              onClick={onDisconnect}
            >
              <span className={cn(busy === "disconnecting" && "invisible")}>Disconnect</span>
              {busy === "disconnecting" && <PendingIndicator />}
            </Button>
          </>
        ) : (
          <Button
            variant={brand ? "default" : "secondary"}
            className={cn("relative", accentClass(brand))}
            disabled={Boolean(busy) || connectDisabled}
            aria-busy={busy === "connecting" || undefined}
            aria-label={busy === "connecting" ? `Connecting ${provider.label}` : undefined}
            onClick={onConnect}
          >
            <span className={cn(busy === "connecting" && "invisible")}>Connect</span>
            {busy === "connecting" && <PendingIndicator />}
          </Button>
        )}
      </div>
    </div>
  );
}

function PendingIndicator() {
  return (
    <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <Spinner className="motion-reduce:animate-none" />
    </span>
  );
}

function StatusBadge({
  status,
  busy,
}: {
  status?: "connected" | "needsReconnect";
  busy: Props["busy"];
}) {
  const reduced = useReducedMotion();
  const label =
    busy === "connecting"
      ? "Connecting…"
      : busy === "disconnecting"
        ? "Disconnecting…"
        : status === "connected"
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
    <span role="status" className="inline-flex items-center text-micro font-medium">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          {...fade(reduced, "fast")}
          className={cn("inline-flex items-center gap-1", busy ? "text-ink-3" : tone)}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
          {label}
        </motion.span>
      </AnimatePresence>
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
