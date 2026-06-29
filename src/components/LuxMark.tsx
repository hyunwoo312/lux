import { cn } from "@/lib/utils";

export function LuxMark({ className }: { className?: string }) {
  return <img src="/logo.svg" alt="" aria-hidden className={cn("object-contain", className)} />;
}
