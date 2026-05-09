import { useState } from "react";
import { cn } from "@/lib/utils";
import { faviconUrl } from "@/widgets/quick-access/favicon";
import { monogram } from "@/widgets/quick-access/lib/url";

type FaviconProps = {
  url: string;
  size: number;
  className?: string;
};

export function Favicon({ url, size, className }: FaviconProps) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(url, size);

  if (failed || !src) {
    return (
      <span
        className={cn(
          "bg-primary/15 text-primary flex items-center justify-center font-semibold",
          className,
        )}
      >
        {monogram(url)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  );
}
