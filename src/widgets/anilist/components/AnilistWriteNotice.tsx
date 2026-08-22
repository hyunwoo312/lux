import { cn } from "@/lib/utils";

export function AnilistWriteNotice({ message }: { message: string }) {
  return (
    <p
      role="status"
      className={cn("text-ink-3 text-micro shrink-0 text-center", message && "px-2 pb-1")}
    >
      {message}
    </p>
  );
}
