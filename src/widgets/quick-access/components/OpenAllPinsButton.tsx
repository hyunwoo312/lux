import { CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { openUrl } from "@/lib/open-url";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { getQuickAccessData, useQuickAccess } from "@/widgets/quick-access/useQuickAccessStore";

export function OpenAllPinsButton() {
  const instanceId = useWidgetInstanceId();
  const count = useQuickAccess((d) => d.links.length);
  const onHome = useQuickAccess((d) => d.activeTab) === "home";

  if (!onHome || count === 0) return null;

  function handleOpenAll() {
    for (const link of getQuickAccessData(instanceId).links) {
      openUrl(link.url, "newTab");
    }
  }

  const label = `Open all ${count} ${count === 1 ? "link" : "links"} in new tabs`;

  return (
    <Tooltip content={label} sticky>
      <Button
        variant="ghost"
        size="icon-xs"
        className={WIDGET_HEADER_ACTION}
        aria-label={label}
        onClick={handleOpenAll}
      >
        <CopyPlus />
      </Button>
    </Tooltip>
  );
}
