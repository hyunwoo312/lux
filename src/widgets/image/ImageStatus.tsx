import { HEADER_LABEL } from "@/widgets/core/BaseWidget";
import { useImageStore } from "@/widgets/image/useImageStore";

export function ImageStatus() {
  const mode = useImageStore((s) => s.mode);
  const single = useImageStore((s) => s.single);
  const items = useImageStore((s) => s.items);
  const hasImage = mode === "multi" ? items.length > 0 : Boolean(single);

  if (hasImage) return null;

  return <span className={HEADER_LABEL}>Image</span>;
}
