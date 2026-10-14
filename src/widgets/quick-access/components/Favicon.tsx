import { useState } from "react";
import { cn } from "@/lib/utils";
import { faviconUrl } from "@/lib/favicon";
import { hashHue, monogram } from "@/widgets/quick-access/lib/url";

type Props = { url: string; size: number; className?: string };
export function Favicon({ url, size, className }: Props) {
  const src = faviconUrl(url, size);
  return <FaviconImage key={src ?? url} url={url} src={src} size={size} className={className} />;
}
function FaviconImage({ url, src, size, className }: Props & { src: string | null }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const hue = hashHue(url);
  return (
    <span
      aria-hidden
      className={cn(
        `
          relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xs
          font-semibold
        `,
        className,
      )}
      style={{ backgroundColor: `oklch(0.6 0.13 ${hue})`, color: `oklch(0.98 0.01 ${hue})` }}
    >
      {monogram(url)}
      {src && !failed && (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            `
              bg-card absolute inset-0 size-full object-contain transition-opacity duration-fast
              motion-reduce:transition-none
            `,
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </span>
  );
}
