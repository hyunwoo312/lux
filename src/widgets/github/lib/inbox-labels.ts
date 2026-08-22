import type { PullRequestCi, PullRequestReview } from "@/widgets/github/types";

export const CI_LABEL: Record<PullRequestCi, string> = {
  success: "Checks passing",
  failure: "Checks failing",
  pending: "Checks running",
  none: "No checks",
};

export const REVIEW_LABEL: Record<PullRequestReview, string> = {
  approved: "Approved",
  changesRequested: "Changes requested",
  reviewRequired: "Review required",
  none: "",
};
