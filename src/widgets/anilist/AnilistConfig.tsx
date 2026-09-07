import { Settings2 } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";
import { ConfigSegmented, ConfigSection, ConfigRow } from "@/components/config/Config";
import { useProviderAccount } from "@/integrations";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { OPEN_BEHAVIOR_OPTIONS } from "@/lib/open-url";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { TitleLanguage, ViewMode } from "@/widgets/anilist/types";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
];

const TITLE_OPTIONS: { value: TitleLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "romaji", label: "Romaji" },
  { value: "native", label: "Native" },
];

export function AnilistConfig() {
  const { account } = useProviderAccount("anilist");
  const instanceId = useWidgetInstanceId();
  const titleLanguage = useAnilist((d) => d.titleLanguage);
  const setTitleLanguage = useAnilistStore((s) => s.setTitleLanguage);
  const openBehavior = useAnilist((d) => d.openBehavior);
  const setOpenBehavior = useAnilistStore((s) => s.setOpenBehavior);
  const viewMode = useAnilist((d) => d.viewMode);
  const setViewMode = useAnilistStore((s) => s.setViewMode);

  const accountDescription = account
    ? account.status === "needsReconnect"
      ? "Reconnect to resume syncing."
      : (account.displayName ?? "Connected")
    : "Not connected — showing trending.";

  return (
    <>
      <ConfigSection title="Account">
        <ConfigRow
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
      </ConfigSection>

      <ConfigSection title="AniList">
        <ConfigRow
          title="Open in"
          description="Where links open"
          control={
            <ConfigSegmented
              label="Open links in"
              value={openBehavior}
              options={OPEN_BEHAVIOR_OPTIONS}
              onChange={(value) => setOpenBehavior(instanceId, value)}
            />
          }
        />
        <ConfigRow
          title="Layout"
          description="Cover grid or compact list, in Library and Discover"
          control={
            <ConfigSegmented
              label="Layout"
              value={viewMode}
              options={VIEW_OPTIONS}
              onChange={(value) => setViewMode(instanceId, value)}
            />
          }
        />
        <ConfigRow
          title="Title language"
          description="How media titles are shown"
          control={
            <ConfigSegmented
              label="Title language"
              value={titleLanguage}
              options={TITLE_OPTIONS}
              onChange={(value) => setTitleLanguage(instanceId, value)}
            />
          }
        />
      </ConfigSection>
    </>
  );
}
