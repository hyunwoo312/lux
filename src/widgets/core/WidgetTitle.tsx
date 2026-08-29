import { HEADER_LABEL } from "@/widgets/core/chromeStyles";
import { useWidgetChrome } from "@/widgets/core/useWidgetChrome";

export function WidgetTitle() {
  return <span className={HEADER_LABEL}>{useWidgetChrome().title}</span>;
}
