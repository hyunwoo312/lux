import type { WidgetIcon } from "@/widgets/core/types";
import type { NewsSource } from "@/widgets/news/types";
import {
  BbcIcon,
  GoogleNewsIcon,
  GuardianIcon,
  NprIcon,
  NytIcon,
  YahooNewsIcon,
} from "@/widgets/news/components/SourceIcon";

export const SOURCE_ICONS: Record<NewsSource, WidgetIcon> = {
  bbc: BbcIcon,
  google: GoogleNewsIcon,
  guardian: GuardianIcon,
  npr: NprIcon,
  nyt: NytIcon,
  yahoo: YahooNewsIcon,
};
