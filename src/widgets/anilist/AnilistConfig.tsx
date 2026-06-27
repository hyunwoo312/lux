import { Settings2 } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";
import {
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useIntegrationStore } from "@/integrations";
import { useSettingsStore } from "@/settings";
import type { OpenBehavior } from "@/lib/open-url";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import type { TitleLanguage } from "@/widgets/anilist/types";

const OPEN_OPTIONS: { value: OpenBehavior; label: string }[] = [
  { value: "currentTab", label: "This tab" },
  { value: "newTab", label: "New tab" },
];

const TITLE_OPTIONS: { value: TitleLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "romaji", label: "Romaji" },
  { value: "native", label: "Native" },
];

export function AnilistConfig() {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist") ?? null,
  );
  const titleLanguage = useAnilistStore((s) => s.titleLanguage);
  const setTitleLanguage = useAnilistStore((s) => s.setTitleLanguage);
  const openBehavior = useAnilistStore((s) => s.openBehavior);
  const setOpenBehavior = useAnilistStore((s) => s.setOpenBehavior);

  const accountDescription = account
    ? account.status === "needsReconnect"
      ? "Reconnect to resume syncing."
      : (account.displayName ?? "Connected")
    : "Not connected — showing trending.";

  return (
    <>
      <WidgetConfigGroup label="Account">
        <WidgetConfigItem
          title="AniList"
          description={accountDescription}
          control={
            <IconActionButton
              icon={Settings2}
              label="Manage account"
              tooltip="Manage account"
              onClick={() => useSettingsStore.getState().openSettings("accounts")}
            />
          }
        />
      </WidgetConfigGroup>

      <WidgetConfigGroup label="AniList">
        <WidgetConfigItem
          title="Open in"
          description="Where links open"
          control={
            <ConfigSegmented
              label="Open links in"
              value={openBehavior}
              options={OPEN_OPTIONS}
              onChange={setOpenBehavior}
            />
          }
        />
        <WidgetConfigItem
          title="Title language"
          description="How media titles are shown"
          control={
            <ConfigSegmented
              label="Title language"
              value={titleLanguage}
              options={TITLE_OPTIONS}
              onChange={setTitleLanguage}
            />
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
