import { cn } from "@/lib/utils";

const SIZE = { sm: "size-4", md: "size-5" } as const;

export function AccentSwatch({ size, className }: { size: keyof typeof SIZE; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary rounded-full shadow-[inset_0_1px_0_0_oklch(1_0_0/0.25)]",
        SIZE[size],
        className,
      )}
    />
  );
}
