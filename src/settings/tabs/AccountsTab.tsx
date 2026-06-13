import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import {
  GitHubServiceIcon,
  GoogleServiceIcon,
  OutlookServiceIcon,
  SpotifyServiceIcon,
} from "@/components/icons/service-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { PermissionsSection } from "@/settings/components/PermissionsSection";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { SpotifySetup } from "@/settings/components/SpotifySetup";
import {
  getIntegrationRedirectUri,
  readSpotifyClientId,
  useIntegrationStore,
  writeSpotifyClientId,
  type IntegrationProviderId,
} from "@/integrations";

type ProviderMeta = {
  id: IntegrationProviderId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const PROVIDERS: ProviderMeta[] = [
  { id: "google", label: "Google", description: "Calendar", icon: GoogleServiceIcon },
  { id: "microsoft", label: "Outlook", description: "Calendar", icon: OutlookServiceIcon },
  { id: "spotify", label: "Spotify", description: "Playback", icon: SpotifyServiceIcon },
  { id: "github", label: "GitHub", description: "Contributions & inbox", icon: GitHubServiceIcon },
];

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

  async function run(id: IntegrationProviderId, kind: Pending, action: () => Promise<void>) {
    setPending((prev) => ({ ...prev, [id]: kind }));
    setErrors((prev) => ({ ...prev, [id]: undefined }));
    try {
      await action();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [id]: error instanceof Error ? error.message : "Something went wrong",
      }));
    } finally {
      setPending((prev) => ({ ...prev, [id]: undefined }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Accounts"
        description="Services used by your widgets. Tokens stay on this device."
      >
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
                  <span className="text-sm font-medium">{provider.label}</span>
                  <StatusBadge status={status} />
                </div>
                <span className="text-muted-foreground truncate text-xs">{subline}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {account ? (
                  confirmDisconnect === provider.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={busy === "disconnecting"}
                        onClick={() => {
                          setConfirmDisconnect(null);
                          void run(provider.id, "disconnecting", () => disconnect(provider.id));
                        }}
                      >
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDisconnect(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      {status === "needsReconnect" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-warning hover:text-warning"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            run(provider.id, "connecting", () => connect(provider.id))
                          }
                        >
                          {busy === "connecting" ? "Reconnecting…" : "Reconnect"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={Boolean(busy)}
                        onClick={() => setConfirmDisconnect(provider.id)}
                      >
                        {busy === "disconnecting" ? "Disconnecting…" : "Disconnect"}
                      </Button>
                    </>
                  )
                ) : (
                  <Button
                    size="sm"
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
            {error && <p className="text-destructive text-xs">{error}</p>}
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
      </SettingsSection>
      <PermissionsSection />
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
        : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[0.7rem] font-medium", tone)}>
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
      <img
        src={avatarUrl}
        alt=""
        aria-hidden
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="
          border-background absolute right-0 bottom-0 size-6 rounded-full border-2 object-cover
        "
      />
    </span>
  );
}
