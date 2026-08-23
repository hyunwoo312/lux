export const FEEDBACK_CATEGORIES = ["bug", "idea", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 1500;

export type Diagnostics = {
  version: string;
  browser: string;
  os: string;
  widgets: string[];
  providers: string[];
};

export type FeedbackDraft = {
  category: FeedbackCategory;
  message: string;
  includeDiagnostics: boolean;
};

export type FeedbackSubmission = {
  category: FeedbackCategory;
  message: string;
  diagnostics?: Diagnostics;
};

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; retryable: boolean; message: string };
