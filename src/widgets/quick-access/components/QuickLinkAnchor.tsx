import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { OpenBehavior } from "@/lib/open-url";

type QuickLinkAnchorProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  url: string;
  title: string;
  openBehavior: OpenBehavior;
  children: ReactNode;
};

export function QuickLinkAnchor({
  url,
  title,
  openBehavior,
  className,
  children,
  ...props
}: QuickLinkAnchorProps) {
  return (
    <a
      href={url}
      title={title}
      target={openBehavior === "newTab" ? "_blank" : undefined}
      rel="noreferrer"
      draggable={false}
      className={cn("press", className)}
      {...props}
    >
      {children}
    </a>
  );
}
