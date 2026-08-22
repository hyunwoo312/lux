import { useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { cn } from "@/lib/utils";

type MediaCoverProps = {
  src?: string;
  srcSmall?: string;
  size?: "thumb" | "full";
  title: string;
  color?: string;
  className?: string;
};

export function MediaCover({
  src,
  srcSmall,
  size = "full",
  title,
  color,
  className,
}: MediaCoverProps) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const showArt = Boolean(src) && !broken;
  const resolved = size === "thumb" ? (srcSmall ?? src) : (src ?? srcSmall);

  return (
    <span
      style={color ? { backgroundColor: showArt ? color : `${color}33` } : undefined}
      className={cn(
        "bg-foreground/10 @container relative block shrink-0 overflow-hidden rounded-lg",
        className,
      )}
    >
      {resolved && !broken ? (
        <RemoteImage
          src={resolved}
          alt=""
          aria-hidden
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
          className={cn(
            `size-full object-cover transition-opacity duration-300 motion-reduce:transition-none`,
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <span
          aria-hidden
          className="
            text-ink-2 absolute inset-0 grid place-items-center text-[38cqw] leading-none
            font-semibold
          "
        >
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
