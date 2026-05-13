import { useImageStore } from "@/widgets/image/useImageStore";

export function ImageStatus() {
  const mode = useImageStore((s) => s.mode);
  const single = useImageStore((s) => s.single);
  const items = useImageStore((s) => s.items);
  const hasImage = mode === "multi" ? items.length > 0 : Boolean(single);

  if (hasImage) return null;

  return (
    <span className="
      text-muted-foreground block truncate text-xs font-medium tracking-wide uppercase
    ">
      Image
    </span>
  );
}
