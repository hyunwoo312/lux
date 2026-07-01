import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { faviconUrl } from "@/lib/favicon";
import { hashHue, monogram } from "@/widgets/quick-access/lib/url";

type FaviconProps = {
  url: string;
  size: number;
  className?: string;
};

export function Favicon({ url, size, className }: FaviconProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const src = faviconUrl(url, size);

  useEffect(() => {
    setFailed(false);
    setLoaded(ref.current?.complete ?? false);
  }, [src]);

  if (failed || !src) {
    const hue = hashHue(url);
    return (
      <span
        style={{ backgroundColor: `oklch(0.6 0.13 ${hue})`, color: `oklch(0.98 0.01 ${hue})` }}
        className={cn("flex items-center justify-center font-semibold", className)}
      >
        {monogram(url)}
      </span>
    );
  }

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn(
        "object-contain transition-opacity duration-300 ease-out motion-reduce:transition-none",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
