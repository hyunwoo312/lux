import { useState } from "react";
import { cn } from "@/lib/utils";

type MediaCoverProps = {
  src?: string;
  title: string;
  color?: string;
  className?: string;
};

export function MediaCover({ src, title, color, className }: MediaCoverProps) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn("shrink-0 rounded object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={color ? { backgroundColor: `${color}33` } : undefined}
      className={cn(
        `
          bg-foreground/10 text-foreground/70 flex shrink-0 items-center justify-center rounded
          text-xs font-semibold
        `,
        className,
      )}
    >
      {title.slice(0, 1).toUpperCase()}
    </span>
  );
}
