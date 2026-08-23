import { useState } from "react";
import { cn } from "@/lib/utils";
import { RemoteImage } from "@/components/media/RemoteImage";

export function TeamLogo({ src, className }: { src?: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return src && failedSrc !== src ? (
    <RemoteImage
      src={src}
      alt=""
      aria-hidden
      onError={() => setFailedSrc(src)}
      className={cn("shrink-0 object-contain", className)}
    />
  ) : (
    <span aria-hidden className={cn("bg-foreground/10 shrink-0 rounded-full", className)} />
  );
}
