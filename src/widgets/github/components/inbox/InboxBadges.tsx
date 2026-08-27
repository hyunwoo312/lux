import { CheckCircle2, CircleDot, CircleSlash, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PullRequestCi, PullRequestReview } from "@/widgets/github/types";

const CI_META = {
  success: { icon: CheckCircle2, tone: "text-success" },
  failure: { icon: XCircle, tone: "text-destructive" },
  pending: { icon: Clock, tone: "text-warning" },
  none: { icon: CircleSlash, tone: "text-ink-3" },
} as const;

export function CiBadge({ ci }: { ci: PullRequestCi }) {
  const { icon: Icon, tone } = CI_META[ci];
  return <Icon className={cn("size-3.5 shrink-0", tone)} aria-hidden />;
}

export function ReviewBadge({ review }: { review: PullRequestReview }) {
  if (review === "none") return null;
  if (review === "approved")
    return <CheckCircle2 className="text-success size-3 shrink-0" aria-hidden />;
  if (review === "changesRequested")
    return <XCircle className="text-destructive size-3 shrink-0" aria-hidden />;
  return <CircleDot className="text-ink-3 size-3 shrink-0" aria-hidden />;
}
