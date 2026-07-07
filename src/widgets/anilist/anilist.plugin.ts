import { AnilistServiceIcon } from "@/components/icons/service-icons";
import type { WidgetPlugin } from "@/widgets/core/types";
import { AnilistWidget } from "@/widgets/anilist/AnilistWidget";
import { AnilistConfig } from "@/widgets/anilist/AnilistConfig";
import { AnilistHeaderActions } from "@/widgets/anilist/AnilistHeaderActions";
import { AnilistTabs } from "@/widgets/anilist/AnilistTabs";

export const anilistPlugin: WidgetPlugin = {
  type: "anilist",
  name: "AniList",
  icon: AnilistServiceIcon,
  brandIcon: true,
  defaultLayout: { w: 6, h: 7, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: AnilistWidget,
  configComponent: AnilistConfig,
  statusComponent: AnilistTabs,
  headerActionComponent: AnilistHeaderActions,
  accent: "cyan",
  removalNote: () => "Its settings will be reset — your AniList account stays connected.",
};
