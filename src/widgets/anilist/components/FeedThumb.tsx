import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";

type FeedThumbProps = {
  variant: "cover" | "avatar";
  src?: string;
  title: string;
  color?: string;
  fallback?: ReactNode;
};

const SLOT = "flex h-12 w-9 shrink-0 items-center justify-center";

export function FeedThumb({ variant, src, title, color, fallback }: FeedThumbProps) {
  if (!src && fallback) {
    return (
      <span className={cn(SLOT, "bg-foreground/10 text-muted-foreground rounded")} aria-hidden>
        {fallback}
      </span>
    );
  }

  if (variant === "avatar") {
    return (
      <span className={SLOT}>
        <MediaCover src={src} title={title} className="size-9 rounded-full" />
      </span>
    );
  }

  return <MediaCover src={src} title={title} color={color} className="h-12 w-9" />;
}
