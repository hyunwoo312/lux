import { AnilistServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";

export function AnilistProfileLink() {
  const name = useIntegrationStore((s) => {
    const account = s.accounts.find((entry) => entry.providerId === "anilist");
    return account?.status === "connected" ? account.displayName : undefined;
  });
  const newTab = useAnilistStore((s) => s.openBehavior === "newTab");

  if (!name) return null;

  return (
    <Tooltip content="Open AniList profile" sticky>
      <a
        href={`https://anilist.co/user/${encodeURIComponent(name)}`}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        aria-label="Open AniList profile"
        className="
          text-muted-foreground/60
          hover:text-foreground
          inline-flex size-7 items-center justify-center rounded-sm
        "
      >
        <AnilistServiceIcon className="size-4" />
      </a>
    </Tooltip>
  );
}
