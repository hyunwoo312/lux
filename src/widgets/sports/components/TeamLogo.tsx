import { cn } from "@/lib/utils";

export function TeamLogo({ src, className }: { src?: string; className?: string }) {
  return src ? (
    <img src={src} alt="" aria-hidden className={cn("shrink-0 object-contain", className)} />
  ) : (
    <span aria-hidden className={cn("bg-foreground/10 shrink-0 rounded-full", className)} />
  );
}
