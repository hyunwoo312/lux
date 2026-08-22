import { Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAiringIn } from "@/widgets/anilist/lib/current";
import { AIRING_SOON_SECONDS } from "@/widgets/anilist/types";

type AiringBadgeProps = {
  airingAt: number;
  episode: number;
  tone?: "art" | "surface";
  className?: string;
};

const SOON_TONE = {
  art: "bg-white/25 text-white",
  surface: "bg-foreground/12 text-ink",
} as const;

export function AiringBadge({ airingAt, episode, tone = "surface", className }: AiringBadgeProps) {
  const now = Date.now();
  const soon = airingAt - Math.floor(now / 1000) <= AIRING_SOON_SECONDS;
  const countdown = formatAiringIn(airingAt, now);
  const Icon = soon ? Zap : Clock;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 tabular-nums",
        className,
        soon && cn("rounded-sm px-1 py-px font-semibold", SOON_TONE[tone]),
      )}
    >
      <Icon className="size-2.5" aria-hidden />
      <span aria-hidden>{countdown}</span>
      <span className="sr-only">
        {soon ? "Airing soon — " : ""}episode {episode} in {countdown}
      </span>
    </span>
  );
}
