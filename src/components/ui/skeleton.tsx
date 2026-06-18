import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-foreground/10 animate-pulse rounded-sm", className)}
      {...props}
    />
  );
}

export { Skeleton };
