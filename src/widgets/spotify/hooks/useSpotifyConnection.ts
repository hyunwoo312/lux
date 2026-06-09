import { useEffect } from "react";
import { useIntegrationStore } from "@/integrations";

export function useSpotifyConnection() {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "spotify") ?? null,
  );
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  return { account, loaded };
}
