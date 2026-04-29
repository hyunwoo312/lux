import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Owned shadcn primitive (PROJECT_RULES §5). Deviation from upstream: the surface uses
// our `glass` utility instead of `bg-card border shadow-sm`, since the glass treatment
// is the project's standard surface. The API stays upstream-compatible.
function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("glass text-card-foreground flex flex-col gap-6 rounded-xl p-6", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-display text-lg leading-tight font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription };
