import { AnilistServiceIcon } from "@/components/icons/service-icons";
import { RemoteImage } from "@/components/media/RemoteImage";
import { Tooltip } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { useAnilist } from "@/widgets/anilist/useAnilistStore";

export function AnilistProfileLink() {
  const account = useIntegrationStore((s) => {
    const entry = s.accounts.find((item) => item.providerId === "anilist");
    return entry?.status === "connected" ? entry : undefined;
  });
  const newTab = useAnilist((d) => d.openBehavior === "newTab");

  if (!account?.displayName) return null;

  return (
    <Tooltip content={`Open ${account.displayName} on AniList`} sticky>
      <a
        href={`https://anilist.co/user/${encodeURIComponent(account.displayName)}`}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        aria-label={`Open ${account.displayName} on AniList`}
        className="
          focus-ring text-ink-4 inline-flex size-7 items-center justify-center rounded-sm
          hover:text-ink
        "
      >
        {account.avatarUrl ? (
          <RemoteImage
            src={account.avatarUrl}
            alt=""
            aria-hidden
            className="size-5 rounded-full object-cover"
          />
        ) : (
          <AnilistServiceIcon className="size-4" />
        )}
      </a>
    </Tooltip>
  );
}
