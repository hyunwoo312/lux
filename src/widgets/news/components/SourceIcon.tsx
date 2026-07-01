import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { WidgetIcon } from "@/widgets/core/types";
import googleNewsIcon from "@/widgets/news/assets/google-news.svg";
import yahooIcon from "@/widgets/news/assets/yahoo.png";
import nytIcon from "@/widgets/news/assets/nyt.svg";
import bbcIcon from "@/widgets/news/assets/bbc.svg";

function ColorIcon({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("size-3.5 shrink-0 object-contain", className)}
    />
  );
}

function maskStyle(src: string): CSSProperties {
  return {
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  };
}

function MonoIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3.5 shrink-0 bg-current", className)}
      style={maskStyle(src)}
    />
  );
}

export const GoogleNewsIcon: WidgetIcon = ({ className }) => (
  <ColorIcon src={googleNewsIcon} className={className} />
);
export const YahooNewsIcon: WidgetIcon = ({ className }) => (
  <ColorIcon src={yahooIcon} className={className} />
);
export const NytIcon: WidgetIcon = ({ className }) => (
  <MonoIcon src={nytIcon} className={className} />
);
export const BbcIcon: WidgetIcon = ({ className }) => (
  <MonoIcon src={bbcIcon} className={className} />
);
