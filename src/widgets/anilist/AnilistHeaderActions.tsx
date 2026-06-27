import { useIntegrationStore } from "@/integrations";
import { AnilistProfileLink } from "@/widgets/anilist/AnilistProfileLink";
import { AnilistRefreshButton } from "@/widgets/anilist/AnilistRefreshButton";

export function AnilistHeaderActions() {
  const connected = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist")?.status === "connected",
  );

  if (!connected) return null;

  return (
    <div className="flex items-center gap-0.5">
      <AnilistProfileLink />
      <AnilistRefreshButton />
    </div>
  );
}
