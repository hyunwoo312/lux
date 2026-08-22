import type { MouseEvent, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import type { OpenBehavior } from "@/lib/open-url";

export function QuickLinkAnchor({
  url,
  title,
  openBehavior,
  className,
  onClick,
  onAuxClick,
  ref,
  children,
}: {
  url: string;
  title: string;
  openBehavior: OpenBehavior;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onAuxClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  ref?: Ref<HTMLAnchorElement>;
  children: ReactNode;
}) {
  return (
    <a
      ref={ref}
      href={url}
      title={title}
      target={openBehavior === "newTab" ? "_blank" : undefined}
      rel="noreferrer"
      draggable={false}
      onClick={onClick}
      onAuxClick={onAuxClick}
      className={cn("press", className)}
    >
      {children}
    </a>
  );
}
