import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AccountRow } from "@/settings/components/AccountRow";
import { PermissionsSection } from "@/settings/components/PermissionsSection";
import { PROVIDERS } from "@/settings/providers";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { SettingsTabBody } from "@/settings/components/SettingsTabBody";
import { SpotifySetup } from "@/settings/components/SpotifySetup";
import { getWidgetPlugin } from "@/widgets/registry";
import {
  accountFor,
  getIntegrationRedirectUri,
  readSpotifyClientId,
  useIntegrationStore,
  writeSpotifyClientId,
  type IntegrationProviderId,
} from "@/integrations";

type Pending = "connecting" | "disconnecting";

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
    <SettingsTabBody>
      <SettingsSection title="Accounts">
        {PROVIDERS.map((provider) => {
          const account = accountFor(accounts, provider.id);
          const busy = pending[provider.id];
          const error = errors[provider.id] ?? account?.lastError;
          const isSpotify = provider.id === "spotify";
          const connectDisabled = isSpotify && !spotifyClientId;

          return (
            <div key={provider.id} className="flex flex-col gap-2">
              <AccountRow
                provider={provider}
                account={account}
                busy={busy}
                connectDisabled={connectDisabled}
                brand={isSpotify ? getWidgetPlugin("spotify")?.tint : undefined}
                onConnect={() => run(provider.id, "connecting", () => connect(provider.id))}
                onDisconnect={() => setConfirmDisconnect(provider.id)}
              />
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
          Outlook and GitHub sign-in goes through a stateless Lux relay that stores nothing. Google,
          Spotify and AniList connect directly.
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
    </SettingsTabBody>
  );
}
