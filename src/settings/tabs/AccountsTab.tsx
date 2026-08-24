import type { ComponentType } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { PermissionsSection } from "@/settings/components/PermissionsSection";
import { PROVIDERS } from "@/settings/providers";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { SpotifySetup } from "@/settings/components/SpotifySetup";
import {
  getIntegrationRedirectUri,
  readSpotifyClientId,
  useIntegrationStore,
  writeSpotifyClientId,
  type IntegrationProviderId,
} from "@/integrations";

type Pending = "connecting" | "disconnecting";

const SPOTIFY_BUTTON_ACCENT = "bg-emerald-500 text-white hover:bg-emerald-600";

export function AccountsTab() {
  const accounts = useIntegrationStore((s) => s.accounts);
  const load = useIntegrationStore((s) => s.load);
  const connect = useIntegrationStore((s) => s.connect);
  const disconnect = useIntegrationStore((s) => s.disconnect);
  const [pending, setPending] = useState<Partial<Record<IntegrationProviderId, Pending>>>({});
  const [errors, setErrors] = useState<Partial<Record<IntegrationProviderId, string>>>({});
  const [spotifyClientId, setSpotifyClientId] = useState<string | undefined>(undefined);
  const [spotifyClientIdLoaded, setSpotifyClientIdLoaded] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState<IntegrationProviderId | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void readSpotifyClientId().then((id) => {
      setSpotifyClientId(id);
      setSpotifyClientIdLoaded(true);
    });
  }, []);

  async function saveSpotifyClientId(clientId: string) {
    await writeSpotifyClientId(clientId);
    setSpotifyClientId(clientId.trim() || undefined);
  }

  const spotifyRedirectUri = getIntegrationRedirectUri("spotify");
  const pendingDisconnect = PROVIDERS.find((provider) => provider.id === confirmDisconnect);

  async function run(id: IntegrationProviderId, kind: Pending, action: () => Promise<void>) {
    setPending((prev) => ({ ...prev, [id]: kind }));
    setErrors((prev) => ({ ...prev, [id]: undefined }));
    try {
      await action();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [id]:
          error instanceof Error
            ? error.message
            : kind === "connecting"
              ? "Couldn’t connect — check your connection and try again."
              : "Couldn’t disconnect — try again.",
      }));
    } finally {
      setPending((prev) => ({ ...prev, [id]: undefined }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Accounts">
        {PROVIDERS.map((provider) => {
          const account = accounts.find((entry) => entry.providerId === provider.id);
          const busy = pending[provider.id];
          const error = errors[provider.id] ?? account?.lastError;
          const status = account?.status;
          const Icon = provider.icon;
          const isSpotify = provider.id === "spotify";
          const connectDisabled = isSpotify && !spotifyClientId;

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
            <div key={provider.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-3 py-2">
                <AccountAvatar
                  Icon={Icon}
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
                          onClick={() => run(provider.id, "connecting", () => connect(provider.id))}
                        >
                          {busy === "connecting" ? "Reconnecting…" : "Reconnect"}
                        </Button>
                      )}
                      <Button
                        variant="ghost-destructive"
                        disabled={Boolean(busy)}
                        onClick={() => setConfirmDisconnect(provider.id)}
                      >
                        {busy === "disconnecting" ? "Disconnecting…" : "Disconnect"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      className={cn(isSpotify && SPOTIFY_BUTTON_ACCENT)}
                      disabled={Boolean(busy) || connectDisabled}
                      onClick={() => run(provider.id, "connecting", () => connect(provider.id))}
                    >
                      {busy === "connecting" ? "Connecting…" : "Connect"}
                    </Button>
                  )}
                </div>
              </div>
              {error && <p className="text-destructive text-caption">{error}</p>}
              {isSpotify && spotifyClientIdLoaded && (
                <SpotifySetup
                  clientId={spotifyClientId}
                  redirectUri={spotifyRedirectUri}
                  onSave={saveSpotifyClientId}
                />
              )}
            </div>
          );
        })}
        <p className="text-ink-3 text-caption">
          Google, Outlook, and GitHub sign-in goes through a stateless Lux relay that stores
          nothing. Spotify and AniList connect directly.
        </p>
      </SettingsSection>
      <PermissionsSection />
      <ConfirmDialog
        open={confirmDisconnect !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmDisconnect(null);
        }}
        title={pendingDisconnect ? `Disconnect ${pendingDisconnect.label}?` : ""}
        description={
          pendingDisconnect
            ? `Widgets using ${pendingDisconnect.label} pause until you reconnect. Nothing else is deleted.`
            : ""
        }
        confirmLabel="Disconnect"
        onConfirm={() => {
          if (!pendingDisconnect) return;
          const { id } = pendingDisconnect;
          setConfirmDisconnect(null);
          void run(id, "disconnecting", () => disconnect(id));
        }}
      />
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
      ? "text-emerald-400"
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
