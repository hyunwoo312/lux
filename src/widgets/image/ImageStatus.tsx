import { WidgetTitle } from "@/widgets/core/WidgetTitle";
import { useImage } from "@/widgets/image/useImageStore";

export function ImageStatus() {
  const mode = useImage((c) => c.mode);
  const single = useImage((c) => c.single);
  const items = useImage((c) => c.items);
  const hasImage = mode === "multi" ? items.length > 0 : Boolean(single);

  if (hasImage) return null;

  return <WidgetTitle />;
}
