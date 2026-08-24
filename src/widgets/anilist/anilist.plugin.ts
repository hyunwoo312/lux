import { AnilistServiceIcon } from "@/components/icons/service-icons";
import { ANILIST_REFRESH_MS } from "@/widgets/anilist/types";
import type { WidgetPlugin } from "@/widgets/core/types";
import { ANILIST_ACCENT } from "@/widgets/anilist/types";
import { AnilistWidget } from "@/widgets/anilist/AnilistWidget";
import { AnilistConfig } from "@/widgets/anilist/AnilistConfig";
import { AnilistHeaderActions } from "@/widgets/anilist/AnilistHeaderActions";
import { AnilistTabs } from "@/widgets/anilist/AnilistTabs";

export const anilistPlugin: WidgetPlugin = {
  type: "anilist",
  name: "AniList",
  category: "media",
  description: "Track the anime and manga you're following",
  icon: AnilistServiceIcon,
  brandIcon: true,
  defaultLayout: { w: 8, h: 9, minW: 6, minH: 7, maxW: 12, maxH: 12 },
  component: AnilistWidget,
  configComponent: AnilistConfig,
  statusComponent: AnilistTabs,
  headerActionComponent: AnilistHeaderActions,
  refreshMs: ANILIST_REFRESH_MS,
  accent: ANILIST_ACCENT,
  removalNote: () => "Its settings will be reset — your AniList account stays connected.",
};
