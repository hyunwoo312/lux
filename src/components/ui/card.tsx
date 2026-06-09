import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("glass text-card-foreground flex flex-col gap-6 rounded-xl p-6", className)}
      {...props}
    />
  );
}

export { Card };
