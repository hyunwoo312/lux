import { useCallback, useEffect, useState } from "react";
import { useIntegrationStore } from "@/integrations";

type ConnectionBusy = "connecting" | "disconnecting" | null;

export function useSpotifyConnection() {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "spotify") ?? null,
  );
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);
  const connectAccount = useIntegrationStore((s) => s.connect);
  const disconnectAccount = useIntegrationStore((s) => s.disconnect);

  const [busy, setBusy] = useState<ConnectionBusy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const connect = useCallback(async () => {
    setBusy("connecting");
    setError(null);
    try {
      await connectAccount("spotify");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect Spotify");
    } finally {
      setBusy(null);
    }
  }, [connectAccount]);

  const disconnect = useCallback(async () => {
    setBusy("disconnecting");
    setError(null);
    try {
      await disconnectAccount("spotify");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not disconnect Spotify");
    } finally {
      setBusy(null);
    }
  }, [disconnectAccount]);

  return { account, loaded, busy, error, connect, disconnect };
}
